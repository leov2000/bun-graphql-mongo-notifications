import { ObjectId } from 'mongodb';
import { BroadcastNotification, TTLOptions } from '../../graphql/resolvers/types';
import { Notification } from '../../graphql/schema/types';
import { AppMongoClient } from '../../mongodb/mongo-client';
import { getMongoCollections } from '../../common/utils';
import { getExpireAtValue } from '../utils';

export const mongoGetGroupNotifications = async (
  groupName: string,
  tags: string[],
  mongoClient: AppMongoClient,
) => {
  const { groupNotificationsCollection } = getMongoCollections(mongoClient);
  let query: Record<string, any> = {
    groupName,
  };

  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  return await groupNotificationsCollection
    .aggregate([
      { $match: query },
      {
        $addFields: {
          tags: { $ifNull: ['$tags', []] },
        },
      },
    ])
    .toArray();
};

export const mongoGetUserNotifications = async (
  user: string,
  sleep: boolean,
  mongoClient: AppMongoClient,
) => {
  const { userNotificationsCollection } = getMongoCollections(mongoClient);
  let query: Record<string, any> = {
    user,
  };

  if (sleep) {
    query.sleep = true;
  } else {
    query.sleep = false;
  }
  return await userNotificationsCollection
    .aggregate([
      { $match: query },
      {
        $addFields: {
          tags: { $ifNull: ['$tags', []] },
        },
      },
    ])
    .toArray();
};

export const mongoGetGroupMembers = async (groupName: string, mongoClient: AppMongoClient) => {
  const { userGroupCollection } = getMongoCollections(mongoClient);
  const group = await userGroupCollection.findOne({ groupName });

  if (!group) {
    return [];
  } else {
    return group.users as string[];
  }
};

export const mongoSendNotification = async (
  toUser: string,
  fromUser: string,
  payload: string,
  ttl: TTLOptions | undefined,
  mongoClient: AppMongoClient,
) => {
  const { userNotificationsCollection } = getMongoCollections(mongoClient);
  const documentID = new ObjectId();
  const createdAt = documentID.getTimestamp();
  const expireAt = getExpireAtValue(ttl ?? { mins: 2 });

  const userNotification: Notification = {
    _id: documentID.toString(),
    user: toUser,
    fromUser,
    payload,
    sleep: false,
    expireAt,
    createdAt: createdAt.toISOString(),
  };

  await userNotificationsCollection.insertOne(userNotification);
  const channel = new BroadcastChannel(`user:${toUser}`);

  userNotification.tags = [];
  channel.postMessage(userNotification);
  channel.close();

  return true;
};

export const mongoSendGroupNotification = async (
  groupName: string,
  fromUser: string,
  payload: string,
  tags: string[],
  ttl: TTLOptions | undefined,
  mongoClient: AppMongoClient,
) => {
  const { groupNotificationsCollection, userNotificationsCollection, userGroupCollection } =
    getMongoCollections(mongoClient);
  const group = (await userGroupCollection.findOne({ groupName })) as Record<'users', string[]>;

  if (!group) {
    throw Error(`Group ${groupName} does not exist in userGroupCollection`);
  }

  const expireAt = getExpireAtValue(ttl ?? { mins: 2 });
  const createdAt = new Date().toISOString();
  const notifications = group.users.map((user) => {
    const notification: Notification = {
      _id: new ObjectId().toString(),
      user,
      fromUser,
      groupName,
      payload,
      sleep: false,
      expireAt,
      createdAt,
    };

    if (tags && tags.length > 0) {
      notification.tags = tags;
    } else {
      notification.tags = [];
    }

    const userChannel = new BroadcastChannel(`user:${user}`);
    userChannel.postMessage(notification);
    userChannel.close();

    return notification;
  });

  if (notifications.length > 0) {
    await userNotificationsCollection.bulkWrite(
      notifications.map((notification) => ({
        insertOne: {
          document: notification,
        },
      })),
    );
  }

  const groupNotification: Notification = {
    _id: new ObjectId().toString(),
    fromUser,
    groupName,
    payload,
    expireAt,
    createdAt,
  };

  if (tags && tags.length > 0) {
    groupNotification.tags = tags;
  } else {
    groupNotification.tags = [];
  }

  const groupChannel = new BroadcastChannel(`groupName:${groupName}`);

  await groupNotificationsCollection.insertOne(groupNotification);
  groupChannel.postMessage({ notification: groupNotification, broadcastTags: tags });
  groupChannel.close();

  return true;
};

export const mongoAddGroupMember = async (
  user: string,
  groupName: string,
  mongoClient: AppMongoClient,
) => {
  const { userGroupCollection } = getMongoCollections(mongoClient);

  const result = await userGroupCollection.updateOne({ groupName }, { $addToSet: { users: user } });

  if (result.matchedCount === 0) {
    throw Error(`Group ${groupName} does not exist in userGroupCollection`);
  }

  return true;
};

export const mongoCreateGroup = async (
  users: string[],
  groupName: string,
  mongoClient: AppMongoClient,
) => {
  const { userGroupCollection } = getMongoCollections(mongoClient);
  const existingGroup = await userGroupCollection.findOne({ groupName });

  if (existingGroup) {
    throw Error(`Group ${groupName} already exists in userGroupCollection`);
  }

  const newGroup = {
    users: [...new Set(users)],
    groupName,
  };

  await userGroupCollection.insertOne(newGroup);

  return true;
};

export const mongoRemoveGroupMember = async (
  user: string,
  groupName: string,
  mongoClient: AppMongoClient,
) => {
  const { userGroupCollection } = getMongoCollections(mongoClient);
  const result = await userGroupCollection.updateOne({ groupName }, { $pull: { users: user } });

  if (result.matchedCount === 0) {
    throw Error(`Group ${groupName} does not exist in userGroupCollection`);
  }

  return true;
};

export const mongoSleepNotification = async (
  notificationID: string,
  mongoClient: AppMongoClient,
) => {
  const { userNotificationsCollection } = getMongoCollections(mongoClient);

  const result = await userNotificationsCollection.updateOne({ _id: notificationID }, [
    { $set: { sleep: { $not: '$sleep' } } },
  ]);

  if (result.matchedCount === 0) {
    throw Error(`Notification with ID ${notificationID} does not exist`);
  }

  return true;
};

export async function* userNotifications(user: string) {
  const channel = new BroadcastChannel(`user:${user}`);
  let messageResolver: ((value: Notification) => void) | null = null;

  channel.onmessage = (event: MessageEvent) => {
    if (messageResolver) {
      messageResolver(event.data);
      messageResolver = null;
    }
  };

  try {
    while (true) {
      const message = await new Promise<Notification>((value) => {
        messageResolver = value;
      });
      yield message;
    }
  } catch (error) {
    console.error(`Subscription error for user ${user}:`, error);
  } finally {
    console.log('channel closed userNotifications');
    channel.close();
  }
}

export async function* groupNotifications(groupName: string, tags: string[]) {
  const groupChannel = new BroadcastChannel(`groupName:${groupName}`);
  let messageResolver: ((value: BroadcastNotification) => void) | null = null;

  groupChannel.onmessage = (event: MessageEvent) => {
    if (messageResolver) {
      messageResolver(event.data);
      messageResolver = null;
    }
  };

  try {
    while (true) {
      const message: BroadcastNotification = await new Promise<BroadcastNotification>((value) => {
        messageResolver = value;
      });
      const { broadcastTags, notification } = message;

      if (broadcastTags && broadcastTags.length > 0) {
        const intersectionSet = new Set(tags).intersection(new Set(broadcastTags));

        if (intersectionSet.size > 0) {
          yield notification;
        }
        if (!tags && !broadcastTags) {
          yield notification;
        }
      }
    }
  } catch (error) {
    console.error(`Subscription error for groupChannel: ${groupName}:`, error);
  } finally {
    console.log('channel closed groupNotifications');
    groupChannel.close();
  }
}
