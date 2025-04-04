import * as grpc from '@grpc/grpc-js';
import { NotificationServiceServer, Notification } from './proto/generated/notifications';
import { AppMongoClient } from '../mongodb/mongo-client';
import {
  mongoAddGroupMember,
  mongoCreateGroup,
  mongoGetGroupMembers,
  mongoGetGroupNotifications,
  mongoGetUserNotifications,
  mongoRemoveGroupMember,
  mongoSendGroupNotification,
  mongoSendNotification,
  mongoSleepNotification,
} from '../common/operations/index';

export const notificationServiceImpl = (mongoClient: AppMongoClient): NotificationServiceServer => {
  return {
    getUserNotifications: async (call, callback) => {
      try {
        const { user, sleep = false } = call.request;
        const result = (await mongoGetUserNotifications(
          user,
          sleep,
          mongoClient,
        )) as any as Notification[];

        callback(null, { notifications: result });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    getGroupMembers: async (call, callback) => {
      try {
        const { groupName } = call.request;
        const result = await mongoGetGroupMembers(groupName, mongoClient);

        callback(null, { users: result });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    getGroupNotifications: async (call, callback) => {
      try {
        const { groupName, tags = [] } = call.request;
        const result = (await mongoGetGroupNotifications(
          groupName,
          tags,
          mongoClient,
        )) as any as Notification[];

        callback(null, { notifications: result });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    sendNotification: async (call, callback) => {
      try {
        const { toUser, fromUser, payload, ttl } = call.request;
        const result = await mongoSendNotification(toUser, fromUser, payload, ttl, mongoClient);

        callback(null, {
          result,
        });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    sendGroupNotification: async (call, callback) => {
      try {
        const { groupName, fromUser, payload, tags = [], ttl } = call.request;
        const result = await mongoSendGroupNotification(
          groupName,
          fromUser,
          payload,
          tags,
          ttl,
          mongoClient,
        );

        callback(null, {
          result,
        });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    addGroupMember: async (call, callback) => {
      try {
        const { user, groupName } = call.request;
        const result = await mongoAddGroupMember(user, groupName, mongoClient);

        callback(null, {
          result,
        });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    createGroup: async (call, callback) => {
      try {
        const { users, groupName } = call.request;
        const result = await mongoCreateGroup(users, groupName, mongoClient);

        callback(null, {
          result,
        });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    removeGroupMember: async (call, callback) => {
      try {
        const { user, groupName } = call.request;
        const result = await mongoRemoveGroupMember(user, groupName, mongoClient);

        callback(null, {
          result,
        });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    sleepNotification: async (call, callback) => {
      try {
        const { notificationId } = call.request;
        const result = await mongoSleepNotification(notificationId, mongoClient);

        callback(null, {
          result,
        });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    subscribeToUserNotifications: (call) => {
      try {
        const { user } = call.request;
        const channel = new BroadcastChannel(`user:${user}`);

        channel.onmessage = (event) => {
          try {
            call.write(event.data);
          } catch (error) {
            console.error(`Error writing to stream for user ${user}:`, error);
          }
        };

        call.on('cancelled', () => {
          console.log(`User notification subscription cancelled for ${user}`);
          channel.close();
        });

        call.on('error', (error) => {
          console.error(`Stream error for user ${user}:`, error);
          channel.close();
        });

        call.on('end', () => {
          console.log(`User notification subscription ended for ${user}`);
          channel.close();
        });
      } catch (error) {
        const errorValue: string = (error as Error).message;
        console.error(`Failed to set up subscription for user:`, error);
        call.destroy({
          message: errorValue,
        });
      }
    },

    subscribeToGroupNotifications: (call) => {
      try {
        const { groupName, tags = [] } = call.request;
        const groupChannel = new BroadcastChannel(`groupName:${groupName}`);

        groupChannel.onmessage = (event: MessageEvent) => {
          try {
            const { broadcastTags = [], notification } = event.data;

            if (broadcastTags && broadcastTags.length > 0) {
              const intersectionSet = new Set(tags).intersection(new Set(broadcastTags));
              notification.tags = broadcastTags;

              if (intersectionSet.size > 0) {
                call.write(notification);
              }
            }
            if ((tags.length === 0 && broadcastTags.length === 0) || tags.length === 0) {
              call.write(notification);
            }
          } catch (error) {
            console.error(`Error writing to stream for group ${groupName}:`, error);
          }
        };

        call.on('cancelled', () => {
          console.log(`Group notification subscription cancelled for ${groupName}`);
          groupChannel.close();
        });

        call.on('error', (error) => {
          console.error(`Stream error for group ${groupName}:`, error);
          groupChannel.close();
        });

        call.on('end', () => {
          console.log(`Group notification subscription ended for ${groupName}`);
          groupChannel.close();
        });
      } catch (error) {
        console.error(`Failed to set up subscription for group:`, error);
        call.destroy({
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  };
};
