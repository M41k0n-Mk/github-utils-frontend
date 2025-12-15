export interface SavedList {
  id: string; // uuid
  name: string;
  items?: string[]; // usernames (optional for summary)
  count?: number; // number of items (for summary)
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export type HistoryAction = 'unfollow' | 'follow';

export interface HistoryEntry {
  id: string; // uuid
  username: string;
  action: HistoryAction;
  timestamp: string; // ISO
  sourceListId?: string;
  dryRun?: boolean; // Optional for local, required for backend
}
