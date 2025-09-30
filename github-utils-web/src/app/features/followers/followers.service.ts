import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Follower } from './follower.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FollowersService {
  private apiUrl = `${environment.apiUrl}/followers/non-followers`;

  constructor(private http: HttpClient) {}

  getFollowers(): Observable<Follower[]> {
    return this.http.get<{ users: Follower[] }>(this.apiUrl)
      .pipe(
        map((resp: { users: Follower[] }) => resp.users),
        catchError(this.handleError)
      );
  }

  /**
   * Handle HTTP errors
   * @param error - HTTP error response
   * @returns Observable error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
