import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Follower } from './follower.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FollowersService {
  private apiUrl = `${environment.apiUrl}/followers`;

  constructor(private http: HttpClient) {}

  /**
   * Get followers for the authenticated user
   * @returns Observable of Follower array
   */
  getFollowers(): Observable<Follower[]> {
    return this.http.get<Follower[]>(`${this.apiUrl}`)
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
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
