import { makeExecutableSchema } from '@graphql-tools/schema';
import { IResolvers } from '@graphql-tools/utils';
import { GraphQLSchema } from 'graphql';
import { createYoga, YogaServerInstance } from 'graphql-yoga';
import { ApplicationConfig } from '../../common/config/types';
import { resolvers } from '../resolvers';
import { mongoClientPlugin } from '../plugins/mongodb-plugin';

export const typeDefs: string = `
  type Notification {
    user: String
    fromUser: String
    groupName: String
    payload: String!
    sleep: Boolean
    tags: [String]
    expireAt: Float
    createdAt: String!
    _id: String!
  }
  
  input TTLOptions {
    mins: Int
    hours: Int
    days: Int
  }

  type UserGroup {
    users: [String]!
  }

  type Subscription {
    userNotifications(user: String!): Notification
    groupNotifications(groupName: String! tags: [String]): Notification
  }

  type Mutation {
    addGroupMember(user: String!, groupName: String!): Boolean!
    createGroup(groupName: String!, users: [String]!): Boolean!
    removeGroupMember(user: String!, groupName: String!): Boolean!
    sendGroupNotification(groupName: String!, fromUser: String!, payload: String!, tags: [String], ttl: TTLOptions): Boolean!
    sendNotification(toUser: String!, fromUser: String!, payload: String!, ttl: TTLOptions): Boolean!
    sleepNotification(notificationID: String!, sleep: Boolean): Boolean!
  }

  type Query {
    getUserNotifications(user: String!, sleep: Boolean): [Notification]!
    getGroupNotifications(groupName: String!, tags: [String]): [Notification]!
    getGroupMembers(groupName: String!): [UserGroup]!
  }
`;

export const schema: GraphQLSchema = makeExecutableSchema({
  typeDefs,
  resolvers: resolvers as unknown as IResolvers<any, any>,
});

export const bootstrapYoga = async (
  appConfig: ApplicationConfig,
): Promise<YogaServerInstance<{}, {}>> => {
  return createYoga({
    schema,
    graphiql: false,
    plugins: [await mongoClientPlugin(appConfig)],
  });
};
