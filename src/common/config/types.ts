export interface ApplicationConfig {
  server: {
    hostname: string;
    port: number;
  };
  database: {
    host: string;
    port: number;
    dbName: string;
    notificationCollectionName: string;
    groupCollectionName: string;
    createdAtTTL: string;
  };
  altair: {
    altairEndpointURL: string;
    altairBaseURL: string;
    graphQLEndpointURL: string;
    graphQLSubscriptionsEndpoint: string;
  };
}
