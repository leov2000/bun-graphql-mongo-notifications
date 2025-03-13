import { AppMongoClient } from './mongo-client';
import { NotificationDocuments, UserGroupDocuments } from './types';
import { TTLOptions } from '../graphql/resolvers/types';
import parse from 'parse-duration';

export const getMongoCollections = (mongoClient: AppMongoClient) => {
  const notificationCollection = mongoClient
    .getDatabase()
    .collection<NotificationDocuments>(mongoClient.notificationCollection);

  const userGroupCollection = mongoClient
    .getDatabase()
    .collection<UserGroupDocuments>(mongoClient.userGroupCollection);

  return {
    notificationCollection,
    userGroupCollection,
  };
};

export const getExpireAtValue = (ttl: TTLOptions): Date => {
  let ttlValue: string;

  if (ttl.days) {
    ttlValue = `${ttl.days} days`;
  } else if (ttl.hours) {
    ttlValue = `${ttl.hours} hours`;
  } else {
    ttlValue = `${ttl.mins} mins`;
  }

  const now = new Date();
  return new Date(now.getTime() + (parse(ttlValue, 'ms') as number));
};
