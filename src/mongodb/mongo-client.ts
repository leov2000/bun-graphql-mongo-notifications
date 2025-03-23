import { MongoClient, Db } from 'mongodb';

export class AppMongoClient {
  mongoHost: string;
  mongoPort: number;
  groupNotificationsCollection: string;
  userGroupCollection: string;
  userNotificationsCollection: string;
  dbName: string;
  database: Db | null;
  client: MongoClient | null;
  clientConnected: boolean;

  constructor(
    mongoHost: string,
    mongoPort: number,
    dbName: string,
    groupNotificationsCollection: string,
    userNotificationsCollection: string,
    userGroupCollection: string,
  ) {
    this.mongoHost = mongoHost;
    this.mongoPort = mongoPort;
    this.groupNotificationsCollection = groupNotificationsCollection;
    this.userNotificationsCollection = userNotificationsCollection;
    this.userGroupCollection = userGroupCollection;
    this.dbName = dbName;
    this.database = null;
    this.client = null;
    this.clientConnected = false;
  }

  async connect(): Promise<void> {
    const uri = this.constructMongoUri();
    try {
      this.client = new MongoClient(uri);

      await this.client.connect();

      this.database = this.client.db(this.dbName);
      this.clientConnected = true;

      console.log(`Successfully connected to MongoDB: ${this.dbName}`);
    } catch (error) {
      console.error('Could not connect to MongoDB:', error);
      this.clientConnected = false;

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.clientConnected) {
      await this.client.close();
      this.clientConnected = false;
      console.log('Successfully disconnected from MongoDB');
    }
  }

  constructMongoUri(): string {
    return `mongodb://${this.mongoHost}:${this.mongoPort}/`;
  }

  getClient(): MongoClient {
    if (!this.clientConnected || !this.client) {
      throw new Error('Client is not connected');
    }
    return this.client;
  }

  getDatabase(): Db {
    if (!this.database) {
      throw new Error(`Not connected to database: ${this.dbName}`);
    }
    return this.database;
  }
}
