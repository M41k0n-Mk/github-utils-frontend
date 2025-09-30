import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { FollowersService } from './followers.service';
import { Follower } from './follower.model';
import { environment } from '../../../environments/environment';

describe('FollowersService', () => {
  let service: FollowersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FollowersService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(FollowersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch followers successfully', () => {
    const mockFollowers: Follower[] = [
      {
        id: 1,
        login: 'testuser1',
        avatar_url: 'https://example.com/avatar1.png',
        html_url: 'https://github.com/testuser1',
        type: 'User'
      },
      {
        id: 2,
        login: 'testuser2',
        avatar_url: 'https://example.com/avatar2.png',
        html_url: 'https://github.com/testuser2',
        type: 'User'
      }
    ];

    service.getFollowers().subscribe(followers => {
      expect(followers).toEqual(mockFollowers);
      expect(followers.length).toBe(2);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/followers`);
    expect(req.request.method).toBe('GET');
    req.flush(mockFollowers);
  });

  it('should handle error when fetching followers fails', () => {
    const errorMessage = 'Failed to fetch followers';

    service.getFollowers().subscribe({
      next: () => fail('should have failed with an error'),
      error: (error) => {
        expect(error).toBeTruthy();
      }
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/followers`);
    req.flush(errorMessage, { status: 500, statusText: 'Server Error' });
  });
});
