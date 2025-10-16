import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FollowersService } from '../followers.service';
import { Follower } from '../follower.model';
import { ConfirmationModal } from '../../../shared/components';

@Component({
  selector: 'app-followers-list',
  standalone: true,
  imports: [CommonModule, ConfirmationModal],
  templateUrl: './followers-list.html',
  styleUrl: './followers-list.scss'
})
export class FollowersList implements OnInit {
  protected readonly followers = signal<Follower[]>([]);
  protected readonly loading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);
  
  // Mass unfollow states
  protected readonly showConfirmModal = signal<boolean>(false);
  protected readonly unfollowLoading = signal<boolean>(false);
  protected readonly successMessage = signal<string | null>(null);

  constructor(private followersService: FollowersService) {}

  ngOnInit(): void {
    this.loadFollowers();
  }

 private loadFollowers(): void {
  this.loading.set(true);
  this.error.set(null);
  
  const timestamp = new Date().toISOString();
  console.log('🔄 Loading non-followers at', timestamp);
  
  this.followersService.getFollowers().subscribe({
    next: (data) => {
      console.log('📊 Non-followers data received:', {
        count: data.length,
        timestamp,
        first5Users: data.slice(0, 5).map(u => u.login),
        last5Users: data.slice(-5).map(u => u.login),
        note: 'This should now be the correct count with full pagination!',
        expectedImprovement: 'Should be more accurate than before'
      });
      
      // Log comparison if we have response with count
      console.log('🎯 Frontend processing complete:', {
        displayedCount: data.length,
        sampleUsers: data.slice(0, 3)
      });
      
      // Check if any of these users actually follow you back (shouldn't happen)
      const suspiciousUsers = data.filter(user => 
        user.login.includes('follow') || user.login.includes('mutual')
      );
      
      if (suspiciousUsers.length > 0) {
        console.warn('⚠️ Suspicious users found (might be followers):', suspiciousUsers);
      }
      
      this.followers.set(data);
      this.loading.set(false);
    },
    error: (err) => {
      console.error('❌ Error loading followers:', err);
      this.error.set(err.message || 'Failed to load followers');
      this.loading.set(false);
    }
  });
}
  protected retryLoad(): void {
    this.loadFollowers();
  }

  // Mass unfollow methods
  protected openConfirmModal(): void {
    this.showConfirmModal.set(true);
  }

  protected closeConfirmModal(): void {
    this.showConfirmModal.set(false);
  }

  protected confirmMassUnfollow(): void {
    this.unfollowLoading.set(true);
    this.successMessage.set(null);
    
    const beforeCount = this.followers().length;
    console.log('🚀 Starting mass unfollow for', beforeCount, 'users');
    
    this.followersService.unfollowNonFollowers().subscribe({
      next: (response) => {
        console.log('✅ Mass unfollow successful:', response);
        this.successMessage.set(response.message);
        this.unfollowLoading.set(false);
        this.showConfirmModal.set(false);
        
        // Reload the list to show updated data with longer delay for GitHub API sync
        console.log('🔄 Waiting 3 seconds before reloading to allow GitHub API sync...');
        setTimeout(() => {
          console.log('🔄 Reloading followers list after mass unfollow');
          this.loadFollowers();
        }, 3000); // Increased delay to 3 seconds
      },
      error: (err) => {
        console.error('❌ Mass unfollow failed:', err);
        this.error.set(err.message || 'Failed to unfollow non-followers');
        this.unfollowLoading.set(false);
        this.showConfirmModal.set(false);
      }
    });
  }

  protected dismissSuccessMessage(): void {
    this.successMessage.set(null);
  }
}
