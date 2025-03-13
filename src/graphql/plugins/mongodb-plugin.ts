import { Plugin } from 'graphql-yoga';
import { AppMongoClient } from '../../mongodb/mongo-client';
import { ApplicationConfig } from '../../common/config/types';
import { NotificationDocuments } from '../../mongodb/types';
import { createTTLIndexes } from '../../mongodb/mongo-ttl-indexes';

export const mongoClientPlugin = async (
  appConfig: ApplicationConfig,
): Promise<Plugin<{ mongoClient: AppMongoClient }>> => {
  const mongoClient = new AppMongoClient(
    appConfig.database.host,
    appConfig.database.port,
    appConfig.database.dbName,
    appConfig.database.notificationCollectionName,
    appConfig.database.groupCollectionName,
  );

  await mongoClient.connect();

  const notificationCollection = mongoClient
    .getDatabase()
    .collection<NotificationDocuments>(mongoClient.notificationCollection);

  await createTTLIndexes(notificationCollection, appConfig.database.createdAtTTL);

  return {
    onContextBuilding: async ({ extendContext }) => {
      extendContext({ mongoClient });
    },
    onDispose: async () => {
      await mongoClient.disconnect();
    },
  };
};
