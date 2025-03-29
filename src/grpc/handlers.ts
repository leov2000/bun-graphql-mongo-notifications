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
        const userGroups = [{ users: result }];

        callback(null, { userGroups });
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
        const ttlOptions = ttl
          ? {
              mins: ttl.mins,
              hours: ttl.hours,
              days: ttl.days,
            }
          : undefined;

        const success = await mongoSendNotification(toUser, fromUser, payload, ttl, mongoClient);

        callback(null, {
          success,
          message: success ? 'Notification sent successfully' : 'Failed to send notification',
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

        const ttlOptions = ttl
          ? {
              mins: ttl.mins,
              hours: ttl.hours,
              days: ttl.days,
            }
          : undefined;

        const success = await mongoSendGroupNotification(
          groupName,
          fromUser,
          payload,
          tags,
          ttl,
          mongoClient,
        );

        callback(null, {
          success,
          message: success
            ? 'Group notification sent successfully'
            : 'Failed to send group notification',
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

        const success = await mongoAddGroupMember(user, groupName, mongoClient);

        callback(null, {
          success,
          message: success
            ? `User ${user} added to group ${groupName}`
            : `Failed to add user ${user} to group ${groupName}`,
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

        const success = await mongoCreateGroup(users, groupName, mongoClient);

        callback(null, {
          success,
          message: success
            ? `Group ${groupName} created successfully`
            : `Failed to create group ${groupName}`,
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

        const success = await mongoRemoveGroupMember(user, groupName, mongoClient);

        callback(null, {
          success,
          message: success
            ? `User ${user} removed from group ${groupName}`
            : `Failed to remove user ${user} from group ${groupName}`,
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

        const success = await mongoSleepNotification(notificationId, mongoClient);

        callback(null, {
          success,
          message: success
            ? `Notification ${notificationId} updated successfully`
            : `Failed to update notification ${notificationId}`,
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
        let channelName;

        if (tags && tags.length > 0) {
          channelName = `groupName:${groupName},tags:${tags.join(',')}`;
        } else {
          channelName = `groupName:${groupName}`;
        }

        const groupChannel = new BroadcastChannel(channelName);

        groupChannel.onmessage = (event) => {
          try {
            call.write(event.data);
          } catch (error) {
            console.error(`Error writing to stream for group ${groupName}:`, error);
          }
        };

        call.on('cancelled', () => {
          console.log(`Group notification subscription cancelled for ${channelName}`);
          groupChannel.close();
        });

        call.on('error', (error) => {
          console.error(`Stream error for group ${groupName}:`, error);
          groupChannel.close();
        });

        call.on('end', () => {
          console.log(`Group notification subscription ended for ${channelName}`);
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
