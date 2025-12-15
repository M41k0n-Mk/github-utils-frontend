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
  protected readonly backendLists = signal<any[]>([]);
  // New: Active imported list for management
  protected readonly activeList = signal<{ name: string; users: Follower[]; selected: Set<string> } | null>(null);

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
    // Fetch backend lists
    this.listsService.getLists().subscribe({
      next: (lists) => {
        this.backendLists.set(lists);
      },
      error: (err) => {
        console.warn('Failed to load backend lists, using local fallback', err);
        this.backendLists.set([]);
      }
    });
    this.loadFollowers();
  }

  private refreshSavedLists(): void {
    try {
      // Prefer backend lists for persistence, fallback to local
      const backend = this.backendLists();
      if (backend.length > 0) {
        this.savedLists.set(backend);
      } else {
        this.savedLists.set(this.localLists.getLists());
      }
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

  protected async exportData(): Promise<void> {
    const selectedUsers = Array.from(this.selected());
    if (selectedUsers.length === 0) {
      alert('No users selected to export.');
      return;
    }

    const format = window.prompt('Choose export format (csv or json):', 'json')?.toLowerCase();
    if (!format || (format !== 'csv' && format !== 'json')) {
      alert('Invalid format. Please choose csv or json.');
      return;
    }

    const destination = window.prompt('Where to export?\n1) File only\n2) Database only\n3) Both file and database\nEnter 1, 2 or 3:', '1');
    if (!destination || !['1', '2', '3'].includes(destination)) {
      alert('Invalid destination. Please choose 1, 2 or 3.');
      return;
    }

    try {
      let content: string;
      let mimeType: string;
      let filename: string;

      if (format === 'csv') {
        content = 'login\n' + selectedUsers.join('\n');
        mimeType = 'text/csv';
        filename = 'selected-users.csv';
      } else {
        content = JSON.stringify({ users: selectedUsers }, null, 2);
        mimeType = 'application/json';
        filename = 'selected-users.json';
      }

      // Handle database save
      if (destination === '2' || destination === '3') {
        const name = window.prompt('List name for database:', `selection-${new Date().toISOString().slice(0,16)}`);
        if (!name) return;
        try {
          console.log('Saving to database...');
          await firstValueFrom(this.listsService.createList(name, selectedUsers));
          this.localLists.saveList(name, selectedUsers); // Also save locally as fallback
          this.refreshSavedLists();
          this.successMessage.set(`Saved to database as "${name}".`);
        } catch (e: any) {
          console.error('Failed to save to database', e);
          this.error.set(e?.message || 'Failed to save to database');
          return;
        }
      }

      // Handle file export
      if (destination === '1' || destination === '3') {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.successMessage.set(`${selectedUsers.length} users exported to file.`);
      }

      if (destination === '3') {
        this.successMessage.set(`Exported to both file and database.`);
      }

    } catch (e: any) {
      console.error('Export failed', e);
      this.error.set(e?.message || 'Export failed');
    }
  }

  protected importData(): void {
    const source = window.prompt('Choose import source:\n1) Database (saved lists)\n2) File (JSON/CSV)\nEnter 1 or 2:', '1');
    if (!source) return;

    if (source === '1') {
      // Import from database
      this.importFromDatabase();
    } else if (source === '2') {
      // Import from file
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.csv';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (file.name.endsWith('.csv')) {
            // Parse CSV to JSON
            const lines = content.split('\n').filter(l => l.trim());
            if (lines.length < 2) {
              alert('Invalid CSV format');
              return;
            }
            const headers = lines[0].split(',');
            const items = lines.slice(1).map(line => {
              const values = line.split(',');
              return values[0]?.trim() || '';
            }).filter(u => u);
            const json = JSON.stringify({ lists: [{ name: file.name.replace('.csv', ''), items }], history: [] });
            this.performImport(json);
          } else {
            this.performImport(content);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } else {
      alert('Invalid choice.');
    }
  }

  private async importFromDatabase(): Promise<void> {
    let lists = this.savedLists();
    if (lists.length === 0) {
      alert('No saved lists found in database.');
      return;
    }
    const options = lists.map((l, i) => `${i+1}) ${l.name} (${l.count || 0} users)`).join('\n');
    const input = window.prompt(`Choose a list to import for management:\n${options}\nEnter the number:`, '1');
    if (!input) return;
    const idx = parseInt(input, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= lists.length) {
      alert('Invalid selection.');
      return;
    }
    const selectedList = lists[idx];

    try {
      // Fetch full list details from backend
      const fullList = await firstValueFrom(this.listsService.getList(selectedList.id));

      // Set as active list for management
      const users = fullList.items.map((username: string) => ({ login: username, avatar_url: '', html_url: '' }));
      this.activeList.set({ name: fullList.name, users, selected: new Set() });
      this.successMessage.set(`"${fullList.name}" imported from database for management.`);
    } catch (e: any) {
      console.error('Failed to load list details', e);
      this.error.set(e?.message || 'Failed to load list details');
    }
  }

  private performImport(json: string): void {
    try {
      const parsed = JSON.parse(json);

      // Check if it's a saved lists export (contains lists array)
      if (parsed.lists && Array.isArray(parsed.lists)) {
        // For the new workflow: Import lists for management instead of just saving
        if (parsed.lists.length === 1) {
          // Single list - set as active for management
          const list = parsed.lists[0];
          const users = list.items.map((username: string) => ({ login: username, avatar_url: '', html_url: '' }));
          this.activeList.set({ name: list.name, users, selected: new Set() });
          this.successMessage.set(`Imported "${list.name}" for management.`);
        } else {
          // Multiple lists - still import to backend/local but don't set active
          parsed.lists.forEach(async (list: any) => {
            try {
              await firstValueFrom(this.listsService.createList(list.name, list.items));
            } catch (e) {
              console.warn('Failed to import list to backend, saving locally', e);
              this.localLists.saveList(list.name, list.items);
            }
          });
          this.localLists.importAll(json);
          this.refreshSavedLists();
          this.successMessage.set('Multiple lists imported.');
        }
      } else if (parsed.name && parsed.items) {
        // Single list format - set as active
        const users = parsed.items.map((username: string) => ({ login: username, avatar_url: '', html_url: '' }));
        this.activeList.set({ name: parsed.name, users, selected: new Set() });
        this.successMessage.set(`Imported "${parsed.name}" for management.`);
      } else {
        // Fallback: treat as username array
        const usernames = Array.isArray(parsed) ? parsed : [parsed];
        const users = usernames.map((username: string) => ({ login: username, avatar_url: '', html_url: '' }));
        this.activeList.set({ name: 'Imported List', users, selected: new Set() });
        this.successMessage.set('Imported username list for management.');
      }

      this.refreshProcessedOnPageCount();
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

  // New methods for active list management
  protected clearActiveSelection(): void {
    const active = this.activeList();
    if (!active) return;
    this.activeList.set({ ...active, selected: new Set() });
  }

  protected selectAllActive(): void {
    const active = this.activeList();
    if (!active) return;
    const allUsernames = new Set(active.users.map(u => u.login));
    this.activeList.set({ ...active, selected: allUsernames });
  }

  protected toggleActiveSelection(username: string): void {
    const active = this.activeList();
    if (!active) return;
    const newSelected = new Set(active.selected);
    if (newSelected.has(username)) {
      newSelected.delete(username);
    } else {
      newSelected.add(username);
    }
    this.activeList.set({ ...active, selected: newSelected });
  }

  protected async followSelectedFromActive(): Promise<void> {
    const active = this.activeList();
    if (!active || active.selected.size === 0) {
      alert('No users selected to follow.');
      return;
    }

    const users = Array.from(active.selected);

    // Check history for already followed users
    const history = [...this.backendHistory(), ...this.localLists.getHistory()].filter(h => h.action === 'follow');
    const alreadyFollowed = users.filter(username =>
      history.some(h => h.username === username && new Date(h.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000)
    );

    if (alreadyFollowed.length > 0) {
      const confirm = window.confirm(`${alreadyFollowed.length} user(s) were already followed in the last 24 hours: ${alreadyFollowed.join(', ')}. Continue anyway?`);
      if (!confirm) return;
    }

    if (!window.confirm(`Follow ${users.length} selected users?`)) return;

    this.unfollowLoading.set(true);
    this.successMessage.set(null);

    let applied = 0;
    const failed: string[] = [];
    for (const username of users) {
      try {
        // Note: Assuming there's a follow endpoint, using unfollow as placeholder
        await this.followersService.unfollowUser(username).toPromise(); // TODO: Replace with follow endpoint
        applied++;
      } catch (e) {
        console.error('Failed to follow', username, e);
        failed.push(username);
      }
    }

    this.unfollowLoading.set(false);
    this.successMessage.set(`Followed: ${applied}${failed.length ? `, Failed: ${failed.length}` : ''}`);
    if (applied > 0) {
      this.localLists.appendHistory(users.slice(0, applied).map(u => ({ username: u, action: 'follow', dryRun: this.dryRunEnabled() })));
      this.refreshProcessedOnPageCount();
    }
  }

  protected async unfollowSelectedFromActive(): Promise<void> {
    const active = this.activeList();
    if (!active || active.selected.size === 0) {
      alert('No users selected to unfollow.');
      return;
    }

    const users = Array.from(active.selected);

    // Check history for already unfollowed users
    const history = [...this.backendHistory(), ...this.localLists.getHistory()].filter(h => h.action === 'unfollow');
    const alreadyUnfollowed = users.filter(username =>
      history.some(h => h.username === username && new Date(h.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000)
    );

    if (alreadyUnfollowed.length > 0) {
      const confirm = window.confirm(`${alreadyUnfollowed.length} user(s) were already unfollowed in the last 24 hours: ${alreadyUnfollowed.join(', ')}. Continue anyway?`);
      if (!confirm) return;
    }

    if (!window.confirm(`Unfollow ${users.length} selected users?`)) return;

    this.unfollowLoading.set(true);
    this.successMessage.set(null);

    let applied = 0;
    const failed: string[] = [];
    for (const username of users) {
      try {
        await this.followersService.unfollowUser(username).toPromise();
        applied++;
      } catch (e) {
        console.error('Failed to unfollow', username, e);
        failed.push(username);
      }
    }

    this.unfollowLoading.set(false);
    this.successMessage.set(`Unfollowed: ${applied}${failed.length ? `, Failed: ${failed.length}` : ''}`);
    if (applied > 0) {
      this.localLists.appendHistory(users.slice(0, applied).map(u => ({ username: u, action: 'unfollow', dryRun: this.dryRunEnabled() })));
      this.refreshProcessedOnPageCount();
      setTimeout(() => this.loadFollowers(), 1500);
    }
  }
}
