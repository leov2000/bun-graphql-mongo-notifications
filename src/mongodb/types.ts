import { Notification } from '../graphql/schema/types';
export interface NotificationDocuments extends Notification {}
export interface UserGroupDocuments {
  users: string[];
  groupName: string;
}
