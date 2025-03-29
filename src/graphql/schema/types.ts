export type Notification = {
  _id: string;
  user?: string;
  fromUser?: string;
  groupName?: string;
  payload: string;
  sleep?: boolean;
  tags?: string[];
  expireAt: Date;
  createdAt: string;
};

// export type UserGroup = {
//   user: string;
  // groupName: string;
// }


// export interface Notification {
//   _id: string;
//   user: string | undefined;
//   fromUser: string;
//   groupName: string | undefined;
//   payload: string;
//   sleep: boolean;
//   tags: string[];
//   expireAt: number | undefined;
//   createdAt: string;
// }