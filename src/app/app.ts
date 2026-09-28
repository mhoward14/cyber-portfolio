import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from './theme.service';
import { EngagementService } from './engagement/engagement.service';
import { TourOverlay } from './tour/tour-overlay';

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TourOverlay],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  sidebarCollapsed = signal(localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');

  constructor(public theme: ThemeService, public engagement: EngagementService) {}

  toggleSidebar() {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
  }
}
