import { makeExecutableSchema } from '@graphql-tools/schema';
import { IResolvers } from '@graphql-tools/utils';
import { GraphQLSchema } from 'graphql';
import { createYoga, YogaServerInstance } from 'graphql-yoga';
import { ApplicationConfig } from '../../common/config/types';
import { resolvers } from '../resolvers';
import { mongoClientPlugin } from '../plugins/mongodb-plugin';

export const typeDefs: string = `
  type Message {
    user: String!
    fromUser: String
    groupName: String
    payload: String!
    sleep: Boolean!
    expireAt: Int
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
    userMessages(user: String!): Message
  }

  type Mutation {
    addGroupMember(user: String!, groupName: String!): Boolean!
    createGroup(groupName: String!, users: [String]!): Boolean!
    removeGroupMember(user: String!, groupName: String!): Boolean!
    sendGroupNotification(groupName: String!, fromUser: String!, payload: String!, ttl: TTLOptions): Boolean!
    sendNotification(toUser: String!, fromUser: String!, payload: String!, ttl: TTLOptions): Boolean!
    sleepMessage(notificationID: String!, sleep: Boolean): Boolean!
  }

  type Query {
    getUserNotifications(user: String!, sleep: Boolean): [Message]!
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
