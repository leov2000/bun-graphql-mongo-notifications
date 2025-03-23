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

export type UserGroup = {
  user: string;
  groupName: string;
}
