import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FollowersService, NonFollowersPreviewReport } from '../followers.service';
import { Follower } from '../follower.model';
import { ConfirmationModal } from '../../../shared/components';
import { firstValueFrom } from 'rxjs';
import { LocalListsService } from '../../../shared/services/local-lists.service';
import { SavedList } from '../../../shared/models/lists.model';
import { DryRunService } from '../../../shared/services/dry-run.service';
import { ListsService } from '../../../shared/services/lists.service';
import { HistoryService, HistoryEntry } from '../../../shared/services/history.service';

@Component({
  selector: 'app-followers-list',
  standalone: true,
  imports: [CommonModule, ConfirmationModal],
  templateUrl: './followers-list.html',
  styleUrl: './followers-list.scss'
})
export class FollowersList implements OnInit {
  // Data & state
  protected readonly followers = signal<Follower[]>([]);
  protected readonly loading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal<number>(1);
  protected readonly size = signal<number>(30);
  protected readonly totalNonFollowers = signal<number>(0);
  protected readonly dryRunEnabled = signal<boolean>(false);
  protected readonly showDryRunBanner = signal<boolean>(true);

  // Selection
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly dryRunToggling = signal<boolean>(false);

  // Mass unfollow states (legacy/global)
  protected readonly showConfirmModal = signal<boolean>(false);
  protected readonly unfollowLoading = signal<boolean>(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly savedLists = signal<SavedList[]>([]);
  protected readonly skipProcessed = signal<boolean>(true);
  protected readonly processedOnPageCount = signal<number>(0);
  protected readonly backendHistory = signal<HistoryEntry[]>([]);

  constructor(private followersService: FollowersService, private localLists: LocalListsService, private dryRun: DryRunService, private listsService: ListsService, private historyService: HistoryService) {}

  ngOnInit(): void {
    this.refreshSavedLists();
    // Fetch dry-run status from server at startup
    this.dryRun.status().subscribe((enabled) => {
      this.dryRunEnabled.set(enabled);
      this.dryRun.enabled.set(enabled);
    });
    // Fetch backend history for consistency
    this.historyService.getHistory().subscribe({
      next: (history) => {
        this.backendHistory.set(history);
      },
      error: (err) => {
        console.warn('Failed to load backend history, using local fallback', err);
        this.backendHistory.set([]);
      }
    });
    this.loadFollowers();
  }

  private refreshSavedLists(): void {
    try {
      this.savedLists.set(this.localLists.getLists());
    } catch (e) {
      console.error('Failed to load saved lists', e);
      this.savedLists.set([]);
    }
  }

  private refreshProcessedOnPageCount(): void {
    try {
      // Prefer backend history for consistency, fallback to local
      let history: HistoryEntry[] = this.backendHistory().filter(h => h.action === 'unfollow');
      if (history.length === 0) {
        const localHistory = this.localLists.getHistory().filter(h => h.action === 'unfollow');
        history = localHistory.map(h => ({ ...h, dryRun: h.dryRun ?? false }));
      }
      const set = new Set(history.map(h => h.username));
      const count = this.followers().filter(u => set.has(u.login)).length;
      this.processedOnPageCount.set(count);
    } catch (e) {
      console.warn('Unable to compute processed count', e);
      this.processedOnPageCount.set(0);
    }
  }

  private loadFollowers(): void {
    this.loading.set(true);
    this.error.set(null);

    const currentPage = this.page();
    const currentSize = this.size();
    const timestamp = new Date().toISOString();
    console.log('🔄 Loading non-followers preview', { currentPage, currentSize, timestamp });

    this.followersService.getNonFollowersPreview(currentPage, currentSize).subscribe({
      next: (report: NonFollowersPreviewReport) => {
        console.log('📊 Preview received:', report);
        this.followers.set(report.users || []);
        this.totalNonFollowers.set(report.totalNonFollowers || report.users?.length || 0);
        this.dryRunEnabled.set(!!report.dryRunEnabled);
        this.loading.set(false);
        this.refreshProcessedOnPageCount();
      },
      error: (err) => {
        console.error('❌ Error loading preview:', err);
        this.error.set(err.message || 'Failed to load non-followers');
        this.loading.set(false);
        this.refreshProcessedOnPageCount();
      }
    });
  }

  protected retryLoad(): void {
    this.loadFollowers();
  }

  protected dismissDryRunBanner(): void {
    this.showDryRunBanner.set(false);
  }

  protected async toggleDryRun(): Promise<void> {
    if (this.dryRunToggling()) return;
    this.dryRunToggling.set(true);
    const current = this.dryRunEnabled();
    try {
      const enabled = await firstValueFrom(this.dryRun.toggle(current));
      this.dryRunEnabled.set(enabled);
      this.dryRun.enabled.set(enabled);
      this.successMessage.set(`Dry-run ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (e: any) {
      console.error('Failed to toggle dry-run', e);
      this.error.set(e?.message || 'Failed to toggle Dry-run');
    } finally {
      this.dryRunToggling.set(false);
    }
  }

  // Pagination
  protected nextPage(): void {
    this.page.update(p => p + 1);
    this.loadFollowers();
  }

  protected prevPage(): void {
    if (this.page() > 1) {
      this.page.update(p => p - 1);
      this.loadFollowers();
    }
  }

  protected changeSize(newSize: number): void {
    this.size.set(newSize);
    this.page.set(1);
    this.loadFollowers();
  }

  // Selection helpers
  protected isSelected(login: string): boolean {
    return this.selected().has(login);
  }

  protected toggleSelection(login: string): void {
    const s = new Set(this.selected());
    if (s.has(login)) s.delete(login); else s.add(login);
    this.selected.set(s);
  }

  protected selectAllOnPage(): void {
    const s = new Set(this.selected());
    this.followers().forEach(u => s.add(u.login));
    this.selected.set(s);
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  // Targeted actions
  protected async unfollowSelected(): Promise<void> {
    const users = Array.from(this.selected());
    if (users.length === 0) return;
    this.unfollowLoading.set(true);
    this.successMessage.set(null);

    console.log('🚀 Unfollow selected users:', users);

    try {
      for (const username of users) {
        await this.followersService.unfollowUser(username).toPromise();
      }
      // Append to local history
      this.localLists.appendHistory(users.map(u => ({ username: u, action: 'unfollow', dryRun: this.dryRunEnabled() })));
      this.refreshProcessedOnPageCount();

      this.successMessage.set(`Unfollowed ${users.length} user(s)`);
      this.clearSelection();
      // Small delay then reload
      setTimeout(() => this.loadFollowers(), 1500);
    } catch (e: any) {
      console.error('❌ Error during unfollow selected:', e);
      this.error.set(e?.message || 'Failed to unfollow selected users');
    } finally {
      this.unfollowLoading.set(false);
    }
  }

  // Lists & history wiring (local fallback)
  protected saveSelectionAsList(): void {
    const users = Array.from(this.selected());
    if (users.length === 0) {
      alert('No users selected to save.');
      return;
    }
    const name = window.prompt('List name:', `selection-${new Date().toISOString().slice(0,16)}`);
    if (!name) return;
    try {
      const list = this.localLists.saveList(name, users);
      this.refreshSavedLists();
      this.successMessage.set(`Saved list "${list.name}" with ${list.items.length} items.`);
    } catch (e:any) {
      console.error('Failed to save list', e);
      this.error.set(e?.message || 'Failed to save list');
    }
  }

  protected async applySavedList(): Promise<void> {
    const lists = this.savedLists();
    if (lists.length === 0) {
      alert('No saved lists found. Save a list first.');
      return;
    }
    const options = lists.map((l, i) => `${i+1}) ${l.name} (${l.items.length})`).join('\n');
    const input = window.prompt(`Choose a list to apply (unfollow):\n${options}\nEnter the number:`, '1');
    if (!input) return;
    const idx = parseInt(input, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= lists.length) {
      alert('Invalid selection.');
      return;
    }
    const list = lists[idx];

    const skip = this.skipProcessed();
    const history = this.localLists.getHistory().filter(h => h.action === 'unfollow');
    const processed = new Set(history.map(h => h.username));

    const toProcess = skip ? list.items.filter(u => !processed.has(u)) : list.items;
    if (toProcess.length === 0) {
      alert('Nothing to apply (all items already processed or list is empty).');
      return;
    }

    this.unfollowLoading.set(true);
    this.successMessage.set(null);

    let applied = 0; const failed: string[] = []; const skipped = list.items.length - toProcess.length;
    for (const username of toProcess) {
      try {
        await this.followersService.unfollowUser(username).toPromise();
        applied++;
      } catch (e) {
        console.error('Failed to unfollow', username, e);
        failed.push(username);
      }
    }

    // Register in local history for successfully applied
    const successful = toProcess.filter(u => !failed.includes(u));
    if (successful.length > 0) {
      this.localLists.appendHistory(successful.map(u => ({ username: u, action: 'unfollow', sourceListId: list.id, dryRun: this.dryRunEnabled() })));
    }

    this.unfollowLoading.set(false);
    this.refreshProcessedOnPageCount();
    this.successMessage.set(`Applied: ${applied}, Skipped: ${skipped}${failed.length?`, Failed: ${failed.length}`:''}`);
    setTimeout(() => this.loadFollowers(), 1500);
  }

  protected async exportData(): Promise<void> {
    try {
      const blob = await firstValueFrom(this.listsService.exportAllLists('json'));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lists-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.successMessage.set('Lists exported successfully.');
    } catch (e: any) {
      console.error('Export failed', e);
      this.error.set(e?.message || 'Export failed');
    }
  }

  protected importData(): void {
    const json = window.prompt('Paste the JSON exported previously:');
    if (!json) return;
    try {
      this.localLists.importAll(json);
      this.refreshSavedLists();
      this.refreshProcessedOnPageCount();
      this.successMessage.set('Import completed.');
    } catch (e:any) {
      console.error('Import failed', e);
      this.error.set(e?.message || 'Import failed');
    }
  }

  protected async undoRecent(onlySelected = false): Promise<void> {
    // Default window 60 minutes
    const defaultMinutes = 60;
    const input = window.prompt('Undo window in minutes (default 60):', String(defaultMinutes));
    const minutes = input ? Math.max(1, parseInt(input, 10)) : defaultMinutes;
    const since = Date.now() - minutes * 60 * 1000;

    const selectedSet = new Set(this.selected());
    const history = this.localLists.getHistory()
      .filter(h => h.action === 'unfollow' && new Date(h.timestamp).getTime() >= since)
      .filter(h => !onlySelected || selectedSet.has(h.username));

    if (history.length === 0) {
      alert('No unfollows to undo within the specified window.');
      return;
    }

    this.unfollowLoading.set(true);
    let refollowed = 0; const failed: string[] = [];
    for (const h of history) {
      try {
        await this.followersService.followUser(h.username).toPromise();
        refollowed++;
      } catch (e) {
        console.error('Failed to refollow', h.username, e);
        failed.push(h.username);
      }
    }

    // Log follow operations to local history
    const successful = history.map(h => h.username).filter(u => !failed.includes(u));
    if (successful.length > 0) {
      this.localLists.appendHistory(successful.map(u => ({ username: u, action: 'follow', dryRun: this.dryRunEnabled() })));
    }

    this.unfollowLoading.set(false);
    this.successMessage.set(`Undo completed. Refollowed: ${refollowed}${failed.length?`, Failed: ${failed.length}`:''}`);
    setTimeout(() => this.loadFollowers(), 1500);
  }

  protected dismissSuccessMessage(): void {
    this.successMessage.set(null);
  }

  // Legacy mass unfollow (kept for now)
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

        console.log('🔄 Waiting 3 seconds before reloading to allow GitHub API sync...');
        setTimeout(() => {
          console.log('🔄 Reloading followers list after mass unfollow');
          this.loadFollowers();
        }, 3000);
      },
      error: (err) => {
        console.error('❌ Mass unfollow failed:', err);
        this.error.set(err.message || 'Failed to unfollow non-followers');
        this.unfollowLoading.set(false);
        this.showConfirmModal.set(false);
      }
    });
  }
}
