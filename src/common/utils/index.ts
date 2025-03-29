import { parseArgs } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import { ApplicationConfig } from '../config/types';
import { TTLOptions } from '../../graphql/resolvers/types';
import parse from 'parse-duration';
import { AppMongoClient } from '../../mongodb/mongo-client';
import { NotificationDocuments, UserGroupDocuments } from '../../mongodb/types';

export const parseApplicationConfig = async (): Promise<ApplicationConfig> => {
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      config: {
        type: 'string',
        short: 'c',
      },
    },
    strict: false,
    allowPositionals: true,
  });

  const configPathFromArgs = values.config as string;
  let config: ApplicationConfig;

  if (existsSync(configPathFromArgs)) {
    console.log(`Bootstrapping Application using path provided from Args ${configPathFromArgs}`);
    config = await import(configPathFromArgs);
  } else {
    const defaultConfigPath = join(import.meta.dir, '../', 'config/config.toml');
    console.log(`Bootstrapping Application using Default path ${defaultConfigPath}`);

    if (existsSync(defaultConfigPath)) {
      config = await import(defaultConfigPath);
    } else {
      throw new Error(
        `Config passed from ARGS or default config cannot be found: Tried:\n- ${configPathFromArgs}\n- ${defaultConfigPath}`,
      );
    }
  }
  return config;
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

export const getMongoCollections = (mongoClient: AppMongoClient) => {
  const groupNotificationsCollection = mongoClient
    .getDatabase()
    .collection<NotificationDocuments>(mongoClient.groupNotificationsCollection);

  const userNotificationsCollection = mongoClient
    .getDatabase()
    .collection<NotificationDocuments>(mongoClient.userNotificationsCollection);

  const userGroupCollection = mongoClient
    .getDatabase()
    .collection<UserGroupDocuments>(mongoClient.userGroupCollection);

  return {
    groupNotificationsCollection,
    userNotificationsCollection,
    userGroupCollection,
  };
};

export const mongoSingletonClient = (appConfig: ApplicationConfig): AppMongoClient => {
  return new AppMongoClient(
    appConfig.database.host,
    appConfig.database.port,
    appConfig.database.dbName,
    appConfig.database.groupNotificationsCollection,
    appConfig.database.userNotificationsCollection,
    appConfig.database.userGroupCollection,
  );
};
