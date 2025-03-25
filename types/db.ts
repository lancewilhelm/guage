export interface LocalMessage {
  id: string;
  chatId: string;
  parentId: string | null;
  childrenIds: string[] | null;
  content: string;
  role: "user" | "assistant";
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
  deleted?: boolean;
}

export interface LocalChat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
  deleted?: boolean;
  pinned: boolean;
  activeBranch: string[];
}
