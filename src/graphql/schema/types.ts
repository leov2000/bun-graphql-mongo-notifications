export type Notification = {
  _id: string;
  user: string;
  fromUser?: string;
  groupName?: string;
  payload: string;
  sleep: boolean;
  expireAt: Date;
  createdAt: string;
};

export type UserGroup = {
  user: string;
  groupName: string;
}
