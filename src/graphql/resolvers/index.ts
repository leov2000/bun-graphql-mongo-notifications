import { Notification } from '../schema/types';
import { Resolvers } from './types';
import { TTLOptions } from '../../grpc/proto/generated/notifications';
import {
  groupNotifications,
  mongoAddGroupMember,
  mongoCreateGroup,
  mongoGetGroupMembers,
  mongoGetGroupNotifications,
  mongoGetUserNotifications,
  mongoRemoveGroupMember,
  mongoSendGroupNotification,
  mongoSendNotification,
  mongoSleepNotification,
  userNotifications,
} from '../../common/operations';

export const resolvers: Resolvers = {
  Query: {
    getUserNotifications: async (_parent: unknown, { user, sleep = false }, context) => {
      return await mongoGetUserNotifications(user, sleep, context.mongoClient);
    },
    getGroupMembers: async (_parent: unknown, { groupName }, context) => {
      return await mongoGetGroupMembers(groupName, context.mongoClient);
    },
    getGroupNotifications: async (_parent: unknown, { groupName, tags }, context) => {
      return await mongoGetGroupNotifications(groupName, tags, context.mongoClient);
    },
  },
  Mutation: {
    sendNotification: async (_parent: unknown, { toUser, fromUser, payload, ttl }, context) => {
      return await mongoSendNotification(
        toUser,
        fromUser,
        payload,
        ttl as TTLOptions,
        context.mongoClient,
      );
    },
    sendGroupNotification: async (
      _parent: unknown,
      { groupName, fromUser, payload, tags, ttl },
      context,
    ) => {
      return await mongoSendGroupNotification(
        groupName,
        fromUser,
        payload,
        tags as string[],
        ttl as TTLOptions,
        context.mongoClient,
      );
    },
    addGroupMember: async (_parent: unknown, { user, groupName }, context) => {
      return await mongoAddGroupMember(user, groupName, context.mongoClient);
    },
    createGroup: async (_parent: unknown, { users, groupName }, context) => {
      return await mongoCreateGroup(users, groupName, context.mongoClient);
    },
    removeGroupMember: async (_parent: unknown, { user, groupName }, context) => {
      return await mongoRemoveGroupMember(user, groupName, context.mongoClient);
    },
    sleepNotification: async (_parent: unknown, { notificationID }, context) => {
      return await mongoSleepNotification(notificationID, context.mongoClient);
    },
  },
  Subscription: {
    userNotifications: {
      resolve: (payload: Notification): Notification => payload,
      subscribe: async function* (_parent: unknown, { user }, _) {
        yield* userNotifications(user);
      },
    },
    groupNotifications: {
      resolve: (payload: Notification): Notification => payload,
      subscribe: async function* (_parent: unknown, { groupName, tags }, _) {
        yield* groupNotifications(groupName, tags);
      },
    },
  },
};
