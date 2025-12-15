import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SavedList, HistoryEntry, HistoryAction } from '../models/lists.model';

function uuid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

@Injectable({ providedIn: 'root' })
export class LocalListsService {
  private listsKey = 'gh_utils_saved_lists_v1';
  private historyKey = 'gh_utils_history_v1';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  getLists(): SavedList[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    const raw = localStorage.getItem(this.listsKey);
    return raw ? JSON.parse(raw) as SavedList[] : [];
  }

  saveList(name: string, items: string[], existingId?: string): SavedList {
    if (!isPlatformBrowser(this.platformId)) return { id: '', name, items: [], createdAt: '', updatedAt: '' };
    const now = new Date().toISOString();
    const lists = this.getLists();

    if (existingId) {
      const idx = lists.findIndex(l => l.id === existingId);
      if (idx >= 0) {
        lists[idx] = { ...lists[idx], name, items: Array.from(new Set(items)), updatedAt: now };
      }
    } else {
      const list: SavedList = { id: uuid(), name, items: Array.from(new Set(items)), createdAt: now, updatedAt: now };
      lists.push(list);
    }

    localStorage.setItem(this.listsKey, JSON.stringify(lists));
    return lists.find(l => l.name === name)!;
  }

  deleteList(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const lists = this.getLists().filter(l => l.id !== id);
    localStorage.setItem(this.listsKey, JSON.stringify(lists));
  }

  getList(id: string): SavedList | undefined {
    return this.getLists().find(l => l.id === id);
  }

  // History
  getHistory(): HistoryEntry[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    const raw = localStorage.getItem(this.historyKey);
    return raw ? JSON.parse(raw) as HistoryEntry[] : [];
  }

  appendHistory(entries: Omit<HistoryEntry, 'id' | 'timestamp'>[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const now = new Date().toISOString();
    const existing = this.getHistory();
    const newEntries: HistoryEntry[] = entries.map(e => ({ id: uuid(), timestamp: now, ...e }));
    localStorage.setItem(this.historyKey, JSON.stringify([...newEntries, ...existing]));
  }

  exportAll(): string {
    const data = {
      lists: this.getLists(),
      history: this.getHistory()
    };
    return JSON.stringify(data, null, 2);
  }

  importAll(json: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const parsed = JSON.parse(json);
    if (parsed?.lists) {
      localStorage.setItem(this.listsKey, JSON.stringify(parsed.lists));
    }
    if (parsed?.history) {
      localStorage.setItem(this.historyKey, JSON.stringify(parsed.history));
    }
  }
}
