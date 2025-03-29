import { Notification } from '../schema/types';
import { AppMongoClient } from '../../mongodb/mongo-client';

type GraphQLNullable<T> = {
  [P in keyof T]: undefined extends T[P] ? Exclude<T[P], undefined> | null : T[P];
};

type GraphQLNotification = GraphQLNullable<Notification>;

interface ResolverContext {
  mongoClient: AppMongoClient;
}

export interface BroadcastNotification {
  broadcastTags?: string[];
  notification: Notification;
}

export interface TTLOptions {
  mins?: number;
  hours?: number;
  days?: number;
}

export interface QueryResolvers {
  getUserNotifications: (
    _parent: unknown,
    args: { user: string; sleep: boolean },
    context: ResolverContext,
  ) => Notification[] | Promise<Notification[]>;
  getGroupNotifications: (
    _parent: unknown,
    args: { groupName: string; tags: string[] },
    context: ResolverContext,
  ) => Notification[] | Promise<Notification[]>;
  getGroupMembers: (
    _parent: unknown,
    args: { groupName: string },
    context: ResolverContext,
  ) => string[] | Promise<string[]>;
}

export interface SubscriptionResolvers {
  userNotifications: {
    resolve: (payload: Notification) => Notification;
    subscribe: (
      _parent: unknown,
      args: { user: string },
      context: ResolverContext,
    ) => AsyncIterator<Notification> | Promise<AsyncIterator<Notification>>;
  };
  groupNotifications: {
    resolve: (payload: Notification) => Notification;
    subscribe: (
      _parent: unknown,
      args: { groupName: string; tags: string[] },
      context: ResolverContext,
    ) => AsyncIterator<Notification> | Promise<AsyncIterator<Notification>>;
  };
}

export interface MutationResolvers {
  addGroupMember: (
    _parent: unknown,
    args: { user: string; groupName: string },
    context: ResolverContext,
  ) => boolean | Promise<boolean>;
  createGroup: (
    _parent: unknown,
    args: { users: string[]; groupName: string },
    context: ResolverContext,
  ) => boolean | Promise<boolean>;
  removeGroupMember: (
    _parent: unknown,
    args: { user: string; groupName: string },
    context: ResolverContext,
  ) => boolean | Promise<boolean>;
  sendGroupNotification: (
    _parent: unknown,
    args: {
      groupName: string;
      fromUser: string;
      payload: string;
      tags?: string[];
      ttl?: TTLOptions;
    },
    context: ResolverContext,
  ) => boolean | Promise<boolean>;
  sendNotification: (
    _parent: unknown,
    args: { toUser: string; fromUser: string; payload: string; ttl?: TTLOptions },
    context: ResolverContext,
  ) => boolean | Promise<boolean>;
  sleepNotification: (
    _parent: unknown,
    args: { notificationID: string; sleep: boolean },
    context: ResolverContext,
  ) => boolean | Promise<boolean>;
}

export interface Resolvers {
  Query: QueryResolvers;
  Subscription: SubscriptionResolvers;
  Mutation: MutationResolvers;
}
