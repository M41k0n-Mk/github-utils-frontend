import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ListSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  count: number;
}

export interface ListDetails extends ListSummary {
  items: string[];
}

export interface ApplyResult {
  applied: number;
  skipped: number;
  details: Array<{ username: string; action: string; skippedReason?: string }>;
  dryRun: boolean;
}

@Injectable({ providedIn: 'root' })
export class ListsService {
  private baseUrl = `${environment.apiUrl}/lists`;

  constructor(private http: HttpClient) {}

  getLists(): Observable<ListSummary[]> {
    return this.http.get<ListSummary[]>(this.baseUrl);
  }

  createList(name: string, items: string[]): Observable<ListDetails> {
    return this.http.post<ListDetails>(this.baseUrl, { name, items });
  }

  getList(id: string): Observable<ListDetails> {
    return this.http.get<ListDetails>(`${this.baseUrl}/${id}`);
  }

  updateList(id: string, name?: string, items?: string[]): Observable<ListDetails> {
    const body: any = {};
    if (name !== undefined) body.name = name;
    if (items !== undefined) body.items = items;
    return this.http.put<ListDetails>(`${this.baseUrl}/${id}`, body);
  }

  deleteList(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  applyList(id: string, action: 'follow' | 'unfollow', skipProcessed = true): Observable<ApplyResult> {
    const params = new HttpParams()
      .set('action', action)
      .set('skipProcessed', skipProcessed.toString());
    return this.http.post<ApplyResult>(`${this.baseUrl}/${id}/apply`, {}, { params });
  }

  exportList(id: string, format: 'csv' | 'json' = 'csv'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(`${this.baseUrl}/${id}/export`, {
      params,
      responseType: 'blob'
    });
  }

  exportAllLists(format: 'json'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(`${this.baseUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }
}