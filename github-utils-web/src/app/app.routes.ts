import { Routes } from '@angular/router';
import { FollowersList } from './features/followers/followers-list/followers-list';

export const routes: Routes = [
  { path: '', redirectTo: '/followers', pathMatch: 'full' },
  { path: 'followers', component: FollowersList }
];
