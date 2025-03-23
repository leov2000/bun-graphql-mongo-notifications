import { Notification } from '../schema/types';
import { Resolvers } from './types';
import { getMongoCollections, getExpireAtValue } from '../../mongodb/utils';
import { ObjectId } from 'mongodb';

export const resolvers: Resolvers = {
  Query: {
    getUserNotifications: async (_parent, { user, sleep = false }, context) => {
      const { userNotificationsCollection } = getMongoCollections(context.mongoClient);
      let query: Record<string, any> = {
        user,
      };

      if (sleep) {
        query.sleep = true;
      } else {
        query.sleep = false;
      }

      return await userNotificationsCollection.find(query).toArray();
    },
    getGroupMembers: async (_parent: unknown, { groupName }, context) => {
      const { userGroupCollection } = getMongoCollections(context.mongoClient);
      const group = await userGroupCollection.findOne({ groupName });

      if (!group) {
        return [];
      } else {
        return group.users as string[];
      }
    },
    getGroupNotifications: async (_parent: unknown, { groupName, tags }, context) => {
      const { userNotificationsCollection } = getMongoCollections(context.mongoClient);
      let query: Record<string, any> = {
        groupName,
      };

      if (tags && tags.length > 0) {
        query.tags = { $all: tags };
      }

      return await userNotificationsCollection.find(query).toArray();
    },
  },
  Mutation: {
    sendNotification: async (_parent, { toUser, fromUser, payload, ttl }, context) => {
      const { userNotificationsCollection } = getMongoCollections(context.mongoClient);
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

      channel.postMessage(userNotification);
      channel.close();

      return true;
    },
    sendGroupNotification: async (
      _parent,
      { groupName, fromUser, payload, tags, ttl },
      context,
    ) => {
      const { groupNotificationsCollection, userNotificationsCollection, userGroupCollection } =
        getMongoCollections(context.mongoClient);
      const group = await userGroupCollection.findOne({ groupName });

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

      let groupNotification: Notification = {
        _id: new ObjectId().toString(),
        fromUser,
        groupName,
        payload,
        expireAt,
        createdAt,
      };

      let groupChannel;
      let channelName;

      if (tags && tags.length > 0) {
        channelName = `groupName:${groupName},tags:${tags.join(',')}`;
        groupChannel = new BroadcastChannel(channelName);
        groupNotification = { ...groupNotification, tags };
      } else {
        channelName = `groupName:${groupName}`;
        groupChannel = new BroadcastChannel(channelName);
      }

      await groupNotificationsCollection.insertOne(groupNotification);
      groupChannel.postMessage(groupNotification);
      groupChannel.close();

      return true;
    },
    addGroupMember: async (_parent, { user, groupName }, context) => {
      const { userGroupCollection } = getMongoCollections(context.mongoClient);

      const result = await userGroupCollection.updateOne(
        { groupName },
        { $addToSet: { users: user } },
      );

      if (result.matchedCount === 0) {
        throw Error(`Group ${groupName} does not exist in userGroupCollection`);
      }

      return true;
    },
    createGroup: async (_parent, { users, groupName }, context) => {
      const { userGroupCollection } = getMongoCollections(context.mongoClient);
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
    },
    removeGroupMember: async (_parent, { user, groupName }, context) => {
      const { userGroupCollection } = getMongoCollections(context.mongoClient);
      const result = await userGroupCollection.updateOne({ groupName }, { $pull: { users: user } });

      if (result.matchedCount === 0) {
        throw Error(`Group ${groupName} does not exist in userGroupCollection`);
      }

      return true;
    },
    sleepNotification: async (_parent, { notificationID }, context) => {
      const { userNotificationsCollection } = getMongoCollections(context.mongoClient);

      const result = await userNotificationsCollection.updateOne({ _id: notificationID }, [
        { $set: { sleep: { $not: '$sleep' } } },
      ]);

      if (result.matchedCount === 0) {
        throw Error(`Notification with ID ${notificationID} does not exist`);
      }

      return true;
    },
  },
  Subscription: {
    userNotifications: {
      resolve: (payload: Notification): Notification => payload,
      subscribe: async function* (_parent, { user }, _) {
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
            console.log(message, 'message from userNotifications subscription');
            yield message;
          }
        } catch (error) {
          console.error(`Subscription error for user ${user}:`, error);
        } finally {
          console.log('channel closed userNotifications');
          channel.close();
        }
      },
    },
    groupNotifications: {
      resolve: (payload: Notification): Notification => payload,
      subscribe: async function* (_parent, { groupName, tags }, _) {
        let groupChannel;
        let channelName;

        if (tags && tags.length > 0) {
          channelName = `groupName:${groupName},tags:${tags.join(',')}`;
          groupChannel = new BroadcastChannel(channelName);
        } else {
          channelName = `groupName:${groupName}`;
          groupChannel = new BroadcastChannel(channelName);
        }

        let messageResolver: ((value: Notification) => void) | null = null;

        groupChannel.onmessage = (event: MessageEvent) => {
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
            console.log(message, 'message from groupNotifications subscription');
            yield message;
          }
        } catch (error) {
          console.error(`Subscription error for groupChannel: ${channelName}:`, error);
        } finally {
          console.log('channel closed groupNotifications');
          groupChannel.close();
        }
      },
    },
  },
};
