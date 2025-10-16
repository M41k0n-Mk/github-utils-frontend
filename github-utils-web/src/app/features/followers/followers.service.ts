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
  private unfollowApiUrl = `${environment.apiUrl}/followers/unfollow-non-followers`;

  constructor(private http: HttpClient) {}

  getFollowers(): Observable<Follower[]> {
    console.log('Making request to:', this.apiUrl);
    
    return this.http.get<{ users: Follower[] }>(this.apiUrl)
      .pipe(
        map((resp: { users: Follower[] }) => {
          console.log('Response received:', resp);
          return resp.users;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Unfollow all non-followers (mass unfollow)
   * @returns Observable with success message
   */
  unfollowNonFollowers(): Observable<{ message: string }> {
    console.log('Making mass unfollow request to:', this.unfollowApiUrl);
    
    return this.http.delete<{ message: string }>(this.unfollowApiUrl)
      .pipe(
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
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      console.error('Backend returned error:', error.error);
      
      if (error.error?.error && error.error?.message) {
        // Backend API error format
        errorMessage = `${error.error.error}: ${error.error.message}`;
      } else if (error.error?.message) {
        // GitHub API error format
        errorMessage = `GitHub API Error: ${error.error.message}`;
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }
    
    console.error('Service Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
