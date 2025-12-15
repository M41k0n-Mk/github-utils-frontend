import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UndoResult {
  refollowed: number;
  details: Array<{ username: string; timestamp: string }>;
  dryRun: boolean;
}

@Injectable({ providedIn: 'root' })
export class UndoService {
  private baseUrl = `${environment.apiUrl}/undo`;

  constructor(private http: HttpClient) {}

  undo(until?: string, usernames?: string[], action: 'unfollow' = 'unfollow'): Observable<UndoResult> {
    const body: any = { action };
    if (until) body.until = until;
    if (usernames) body.usernames = usernames;
    return this.http.post<UndoResult>(this.baseUrl, body);
  }
}