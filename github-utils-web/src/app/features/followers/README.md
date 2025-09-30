# Followers Feature

## Overview
The Followers feature provides a complete UI for displaying GitHub followers data from the backend API.

## Location
`src/app/features/followers/`

## Files
- `follower.model.ts` - TypeScript interface for Follower data
- `followers.service.ts` - Service class for API communication
- `followers.service.spec.ts` - Unit tests for the service
- `followers-list/` - Component directory
  - `followers-list.ts` - Component class with loading, error, and success states
  - `followers-list.html` - Template with followers grid display
  - `followers-list.scss` - Component styles
- `index.ts` - Barrel export for cleaner imports

## Component Usage

The `FollowersListComponent` is automatically displayed when navigating to `/followers` route.

### Features
- **Loading State**: Displays a spinner while fetching data
- **Error State**: Shows error message with retry button
- **Empty State**: Displays message when no followers found
- **Success State**: Grid layout showing followers with:
  - Avatar images
  - Username (login)
  - User type badge (User/Organization)
  - Link to GitHub profile

### Routing
The component is configured in `app.routes.ts`:
```typescript
export const routes: Routes = [
  { path: '', redirectTo: '/followers', pathMatch: 'full' },
  { path: 'followers', component: FollowersList }
];
```

## Service Usage

### Import the Service
```typescript
import { FollowersService } from './features/followers';
// or
import { FollowersService } from './features/followers/followers.service';
```

### Inject in Component
```typescript
import { Component, OnInit } from '@angular/core';
import { FollowersService, Follower } from './features/followers';

@Component({
  selector: 'app-followers-list',
  templateUrl: './followers-list.component.html'
})
export class FollowersListComponent implements OnInit {
  followers: Follower[] = [];
  loading = false;
  error: string | null = null;

  constructor(private followersService: FollowersService) {}

  ngOnInit(): void {
    this.loadFollowers();
  }

  loadFollowers(): void {
    this.loading = true;
    this.error = null;

    this.followersService.getFollowers().subscribe({
      next: (data) => {
        this.followers = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }
}
```

## API Endpoint
The service consumes the following endpoint:
- **GET** `/api/followers` - Returns an array of followers

## Data Model

```typescript
interface Follower {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  type: string;
}
```

## Configuration
The API URL is configured in:
- `src/environments/environment.ts` (production)
- `src/environments/environment.development.ts` (development)

Default API URL: `http://localhost:8080/api`

## Error Handling
The service includes comprehensive error handling:
- Catches HTTP errors
- Logs errors to console
- Returns meaningful error messages
- Handles both client-side and server-side errors

## Testing
Run tests with:
```bash
npm test
```

The service includes unit tests that verify:
- Service creation
- Successful data fetching
- Error handling
