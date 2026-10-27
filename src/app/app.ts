import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from './theme.service';
import { EngagementService } from './engagement/engagement.service';
import { TourOverlay } from './tour/tour-overlay';
import { EmailLink } from './security/email-link';
import { TourService } from './tour/tour.service';
import { focusPageHeading, pagePath } from './a11y/route-focus';
import { TOOLS } from './tools-data';

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

/** Pages that belong to the Security Tools group: each tool, and the Engagement Report they feed. */
const TOOL_PATHS = new Set([...TOOLS.map((tool) => tool.route), '/report']);

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TourOverlay, EmailLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  sidebarCollapsed = signal(localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
  /** The individual tool links stay folded away on the portfolio pages and open once you are in a tool. */
  toolsOpen = signal(false);

  private readonly tour = inject(TourService);
  private lastPath: string | null = null;

  constructor(public theme: ThemeService, public engagement: EngagementService, router: Router) {
    // After each real page change, move focus to the new page's heading so a
    // screen reader announces it. Skipped on first load (don't steal focus), for
    // query-only changes, and while the guided tour owns focus.
    router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        const path = pagePath(e.urlAfterRedirects);
        const isPageChange = this.lastPath !== null && path !== this.lastPath;
        this.lastPath = path;
        if (TOOL_PATHS.has(path)) this.toolsOpen.set(true);
        if (isPageChange && !this.tour.active()) focusPageHeading();
      });
  }

  /** "Skip to main content". The site uses hash routing, so a plain #anchor link
   *  would be read as a route; move focus by hand instead. */
  skipToMain(event: Event) {
    event.preventDefault();
    // focus() also scrolls the target into view
    document.getElementById('main-content')?.focus();
  }

  toggleTools() {
    this.toolsOpen.set(!this.toolsOpen());
  }

  toggleSidebar() {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
  }
}
