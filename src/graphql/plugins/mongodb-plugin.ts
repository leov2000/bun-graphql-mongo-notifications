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
    appConfig.database.groupNotificationsCollection,
    appConfig.database.userNotificationsCollection,
    appConfig.database.userGroupCollection,
  );

  await mongoClient.connect();

  const userNotificationsCollection = mongoClient
    .getDatabase()
    .collection<NotificationDocuments>(mongoClient.userNotificationsCollection);
  
  const groupNotificationsCollection = mongoClient
    .getDatabase()
    .collection<NotificationDocuments>(mongoClient.userNotificationsCollection);

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
