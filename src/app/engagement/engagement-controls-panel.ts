import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EngagementService } from './engagement.service';
import { EngagementControl } from './engagement.model';

export type PanelStatus = 'saved' | 'stale' | 'add' | 'start';

/** Engagement Mode hand-off shared by the control tools (Cloud Security,
 *  Zero Trust, CI/CD Pipeline). Shows whether the tool's current settings
 *  are in the engagement and offers to add or update them. */
@Component({
  selector: 'app-engagement-controls-panel',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="ecp" [style.--ecp-accent]="accent()" aria-live="polite">
      <span class="ecp-label">// ENGAGEMENT MODE</span>
      <p class="ecp-count">
        <strong>{{ controls().length }} NIST 800-53 controls</strong>
        &middot; {{ implementedCount() }} implemented &middot; {{ controls().length - implementedCount() }} planned
      </p>
      @switch (status()) {
        @case ('saved') {
          <p>These controls are in your engagement.</p>
          <a class="ecp-btn" routerLink="/report">View Engagement Report &rarr;</a>
        }
        @case ('stale') {
          <p>Your settings changed since you added them.</p>
          <button type="button" class="ecp-btn" (click)="save()">Update Engagement</button>
        }
        @case ('add') {
          <p>Add them to <strong>{{ engagement.state()!.scenario }}</strong>.</p>
          <button type="button" class="ecp-btn" (click)="save()">Add to Engagement</button>
        }
        @default {
          <p>Start an engagement with these controls and trace them in one exportable report.</p>
          <button type="button" class="ecp-btn" (click)="save()">Start Engagement</button>
        }
      }
    </div>
  `,
  styles: `
    .ecp {
      --ecp-accent: var(--color-accent);
      display: grid;
      gap: 0.45rem;
      margin-top: 1rem;
      padding: 1rem 1.1rem;
      border: 1px solid color-mix(in srgb, var(--ecp-accent) 40%, var(--color-border));
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--ecp-accent) 7%, var(--color-surface));
      font-size: 0.86rem;
      color: var(--color-text-muted);
    }
    .ecp p { margin: 0; line-height: 1.5; }
    .ecp strong { color: var(--color-text); }
    .ecp-label {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--ecp-accent);
    }
    :host-context(.light-mode) .ecp-label { color: color-mix(in srgb, var(--ecp-accent) 50%, #0f172a); }
    .ecp-btn {
      justify-self: start;
      margin-top: 0.25rem;
      padding: 0.55rem 1rem;
      border: 1px solid var(--ecp-accent);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--ecp-accent) 55%, #0f172a);
      color: #fff;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: filter 0.2s;
    }
    .ecp-btn:hover { color: #fff; filter: brightness(1.1); }
    .ecp-btn:focus-visible { outline: 2px solid var(--ecp-accent); outline-offset: 2px; }
  `,
})
export class EngagementControlsPanel {
  readonly engagement = inject(EngagementService);

  readonly sourceKey = input.required<string>();
  readonly controls = input.required<EngagementControl[]>();
  readonly accent = input<string>('var(--color-accent)');

  readonly implementedCount = computed(() => this.controls().filter((c) => c.status === 'implemented').length);

  readonly status = computed<PanelStatus>(() => {
    const s = this.engagement.state();
    if (!s || s.isSample) return 'start';
    const saved = s.controls.filter((c) => c.sourceKey === this.sourceKey());
    if (saved.length === 0) return 'add';
    return signature(saved) === signature(this.controls()) ? 'saved' : 'stale';
  });

  save() {
    this.engagement.setControls(this.sourceKey(), this.controls());
  }
}

function signature(controls: EngagementControl[]): string {
  return controls
    .map((c) => `${c.sourceTool}|${c.id}|${c.status}|${c.basis ?? ''}`)
    .sort()
    .join('\n');
}
