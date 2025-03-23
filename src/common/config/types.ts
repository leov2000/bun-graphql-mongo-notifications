export interface ApplicationConfig {
  server: {
    hostname: string;
    port: number;
  };
  database: {
    host: string;
    port: number;
    dbName: string;
    groupNotificationsCollection: string;
    userNotificationsCollection: string;
    userGroupCollection: string;
    createdAtTTL: string;
  };
  altair: {
    altairEndpointURL: string;
    altairBaseURL: string;
    graphQLEndpointURL: string;
    graphQLSubscriptionsEndpoint: string;
  };
}
