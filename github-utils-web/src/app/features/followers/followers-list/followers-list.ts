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
  console.log('Carregando não-seguidores...');
  this.followersService.getFollowers().subscribe({
    next: (data) => {
      console.log('Dados recebidos:', data);
      this.followers.set(data);
      this.loading.set(false);
    },
    error: (err) => {
      console.log('Erro ao carregar:', err);
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
    
    this.followersService.unfollowNonFollowers().subscribe({
      next: (response) => {
        console.log('Mass unfollow successful:', response);
        this.successMessage.set(response.message);
        this.unfollowLoading.set(false);
        this.showConfirmModal.set(false);
        
        // Reload the list to show updated data
        setTimeout(() => {
          this.loadFollowers();
        }, 1000);
      },
      error: (err) => {
        console.error('Mass unfollow failed:', err);
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
