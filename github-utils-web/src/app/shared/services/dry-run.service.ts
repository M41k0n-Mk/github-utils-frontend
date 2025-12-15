import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';

interface DryRunStatusResponse {
  enabled: boolean;
  description?: string;
  lastChanged?: string;
}

@Injectable({ providedIn: 'root' })
export class DryRunService {
  private baseUrl = `${environment.apiUrl}/dry-run`;
  // cache state to avoid flicker; truth comes from server
  readonly enabled = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  status(): Observable<boolean> {
    return this.http.get<DryRunStatusResponse>(`${this.baseUrl}/status`).pipe(
      map(r => !!r.enabled),
      catchError((err) => {
        console.warn('[DryRun] status failed, assuming disabled temporarily', err);
        return of(false);
      })
    );
  }

  enable(): Observable<boolean> {
    return this.http.post<DryRunStatusResponse>(`${this.baseUrl}/enable`, {}).pipe(
      map(r => !!r.enabled),
      catchError(this.handleToggleError)
    );
  }

  disable(): Observable<boolean> {
    return this.http.post<DryRunStatusResponse>(`${this.baseUrl}/disable`, {}).pipe(
      map(r => !!r.enabled),
      catchError(this.handleToggleError)
    );
  }

  toggle(current: boolean): Observable<boolean> {
    return this.http.post<DryRunStatusResponse>(`${this.baseUrl}/toggle`, {}).pipe(
      map(r => !!r.enabled),
      catchError(this.handleToggleError)
    );
  }

  toggleAlt(current: boolean): Observable<boolean> {
    // Prefer explicit enable/disable to avoid race conditions
    return (current ? this.disable() : this.enable());
  }

  private handleToggleError(err: any) {
    const msg = err?.error?.message || err?.message || 'Dry-run toggle failed';
    return throwError(() => new Error(msg));
  }
}
