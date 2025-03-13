import { Collection } from 'mongodb';
import parse from 'parse-duration';
import { NotificationDocuments } from './types';

export const createTTLIndexes = async (
  collection: Collection<NotificationDocuments>,
  createdAtTTL: string,
): Promise<void> => {
  await collection.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: parse(createdAtTTL, 's') as number, name: 'TTLIndex_Default' },
  );

  await collection.createIndex(
    { expireAt: 1 },
    { expireAfterSeconds: 0, name: 'TTLIndex_ExpireAt' },
  );

  console.log('TTL indexes created for createdAt and expireAt fields');
};
