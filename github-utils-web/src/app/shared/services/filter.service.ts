import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EnrichedUser {
  login: string;
  htmlUrl: string;
  lastPublicActivity: string | null;
  lastPushAt: string | null;
  followersCount: number;
  reposCount: number;
  languages: string[];
  followsYou: boolean;
  youFollow: boolean;
  contributionsEstimate: number;
}

export interface FilterResult {
  totalCandidates: number;
  totalMatched: number;
  page: number;
  size: number;
  users: EnrichedUser[];
}

@Injectable({ providedIn: 'root' })
export class FilterService {
  private baseUrl = `${environment.apiUrl}/filter`;

  constructor(private http: HttpClient) {}

  evaluate(
    page = 1,
    size = 30,
    inactiveDays?: number,
    lastPushDays?: number,
    followersLt?: number,
    followersGt?: number,
    reposLt?: number,
    reposGt?: number,
    languages?: string[],
    followsYou?: boolean,
    contribLt?: number,
    contribGt?: number,
    format?: 'csv' | 'json'
  ): Observable<FilterResult | Blob> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (inactiveDays !== undefined) params = params.set('inactiveDays', inactiveDays.toString());
    if (lastPushDays !== undefined) params = params.set('lastPushDays', lastPushDays.toString());
    if (followersLt !== undefined) params = params.set('followersLt', followersLt.toString());
    if (followersGt !== undefined) params = params.set('followersGt', followersGt.toString());
    if (reposLt !== undefined) params = params.set('reposLt', reposLt.toString());
    if (reposGt !== undefined) params = params.set('reposGt', reposGt.toString());
    if (languages && languages.length > 0) params = params.set('languages', languages.join(','));
    if (followsYou !== undefined) params = params.set('followsYou', followsYou.toString());
    if (contribLt !== undefined) params = params.set('contribLt', contribLt.toString());
    if (contribGt !== undefined) params = params.set('contribGt', contribGt.toString());
    if (format) params = params.set('format', format);

    const url = `${this.baseUrl}/evaluate`;
    if (format) {
      return this.http.get(url, { params, responseType: 'blob' });
    } else {
      return this.http.get<FilterResult>(url, { params });
    }
  }

  smartSuggest(page = 1, size = 30): Observable<FilterResult> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<FilterResult>(`${this.baseUrl}/smart-suggest`, { params });
  }
}