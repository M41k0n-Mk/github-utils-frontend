import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ImportResult {
  received: number;
  applied: number;
  skipped: number;
  dryRun: boolean;
  details: Array<{ username: string; status: string; message?: string }>;
}

@Injectable({ providedIn: 'root' })
export class ImportService {
  private baseUrl = `${environment.apiUrl}/import`;

  constructor(private http: HttpClient) {}

  importRefollow(data: string | File): Observable<ImportResult> {
    const formData = new FormData();
    if (data instanceof File) {
      formData.append('file', data);
    } else {
      formData.append('data', data);
    }
    return this.http.post<ImportResult>(`${this.baseUrl}/refollow`, formData);
  }

  importExclude(data: string | File): Observable<ImportResult> {
    const formData = new FormData();
    if (data instanceof File) {
      formData.append('file', data);
    } else {
      formData.append('data', data);
    }
    return this.http.post<ImportResult>(`${this.baseUrl}/exclude`, formData);
  }

  importUsers(action: 'refollow' | 'exclude', data: string | File, skipProcessed = true): Observable<ImportResult> {
    const params = new HttpParams()
      .set('action', action)
      .set('skipProcessed', skipProcessed.toString());
    const formData = new FormData();
    if (data instanceof File) {
      formData.append('file', data);
    } else {
      formData.append('data', data);
    }
    return this.http.post<ImportResult>(`${this.baseUrl}/users`, formData, { params });
  }
}