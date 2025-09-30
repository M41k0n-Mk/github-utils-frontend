import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FollowersService } from '../followers.service';
import { Follower } from '../follower.model';

@Component({
  selector: 'app-followers-list',
  imports: [CommonModule],
  templateUrl: './followers-list.html',
  styleUrl: './followers-list.scss'
})
export class FollowersList implements OnInit {
  protected readonly followers = signal<Follower[]>([]);
  protected readonly loading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);

  constructor(private followersService: FollowersService) {}

  ngOnInit(): void {
    this.loadFollowers();
  }

  private loadFollowers(): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.followersService.getFollowers().subscribe({
      next: (data) => {
        this.followers.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load followers');
        this.loading.set(false);
      }
    });
  }

  protected retryLoad(): void {
    this.loadFollowers();
  }
}
