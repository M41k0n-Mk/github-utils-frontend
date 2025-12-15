import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface HistoryEntry {
  id: string;
  username: string;
  action: 'follow' | 'unfollow';
  timestamp: string;
  sourceListId?: string;
  dryRun: boolean;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private baseUrl = `${environment.apiUrl}/history`;

  constructor(private http: HttpClient) {}

  getHistory(username?: string, action?: 'follow' | 'unfollow', since?: string): Observable<HistoryEntry[]> {
    let params = new HttpParams();
    if (username) params = params.set('username', username);
    if (action) params = params.set('action', action);
    if (since) params = params.set('since', since);
    return this.http.get<HistoryEntry[]>(this.baseUrl, { params });
  }

  exportHistory(username?: string, action?: 'follow' | 'unfollow', since?: string, format: 'csv' | 'json' = 'csv'): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (username) params = params.set('username', username);
    if (action) params = params.set('action', action);
    if (since) params = params.set('since', since);
    return this.http.get(`${this.baseUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }
}