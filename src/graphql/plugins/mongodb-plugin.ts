import { Plugin } from 'graphql-yoga';
import { AppMongoClient } from '../../mongodb/mongo-client';
import { ApplicationConfig } from '../../common/config/types';
import { NotificationDocuments } from '../../mongodb/types';
import { createTTLIndexes } from '../../mongodb/mongo-ttl-indexes';

export const mongoClientPlugin = async (
  appConfig: ApplicationConfig,
  mongoClient: AppMongoClient,
): Promise<Plugin<{ mongoClient: AppMongoClient }>> => {
  const userNotificationsCollection = mongoClient
    .getDatabase()
    .collection<NotificationDocuments>(mongoClient.userNotificationsCollection);

  const groupNotificationsCollection = mongoClient
    .getDatabase()
    .collection<NotificationDocuments>(mongoClient.groupNotificationsCollection);

  await createTTLIndexes(userNotificationsCollection, appConfig.database.createdAtTTL);
  await createTTLIndexes(groupNotificationsCollection, appConfig.database.createdAtTTL);

  return {
    onContextBuilding: async ({ extendContext }) => {
      extendContext({ mongoClient });
    },
    onDispose: async () => {
      await mongoClient.disconnect();
    },
  };
};
