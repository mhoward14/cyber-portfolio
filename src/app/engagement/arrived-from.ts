import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { TACTIC_STAGES } from '../attack-path/attack-path-data';

export interface ArrivedTechnique {
  attackId: string;
  name: string;
  tactic: string;
  note: string;
}

const ATTACK_ID = /^T\d{4}(\.\d{3})?$/;

/** Find an Attack Path technique by ATT&CK ID, preferring the entry whose
 *  mapped defense points at `route` (T1078 appears under two tactics with
 *  different defenses). Returns null for unknown or malformed IDs. */
export function findArrivedTechnique(attackId: string | null, route: string): ArrivedTechnique | null {
  if (!attackId || !ATTACK_ID.test(attackId)) return null;
  const matches = TACTIC_STAGES.flatMap((stage) =>
    stage.techniques.filter((t) => t.attackId === attackId).map((t) => ({ stage, t })),
  );
  const hit = matches.find((m) => m.t.defense.route === route) ?? matches[0];
  if (!hit) return null;
  return { attackId, name: hit.t.name, tactic: hit.stage.name, note: hit.t.defense.note };
}

/** Banner a tool shows when a visitor follows a "defend against this" link
 *  from the Attack Path Builder (…?from=T1566). Emits `arrived` once with
 *  the technique so the tool can open the relevant section. */
@Component({
  selector: 'app-arrived-from',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (technique(); as t) {
      @if (!dismissed()) {
        <aside class="af" [style.--af-accent]="accent()" aria-label="Arrived from the Attack Path Builder">
          <div class="af-body">
            <span class="af-label">// FROM THE ATTACK PATH</span>
            <p>You followed <strong>{{ t.name }}</strong> ({{ t.attackId }}, {{ t.tactic }}). Here, {{ t.note }}</p>
          </div>
          <div class="af-actions">
            <a class="af-back" routerLink="/attack-path">&larr; Back to Attack Path</a>
            <button type="button" class="af-close" (click)="dismissed.set(true)" aria-label="Dismiss">&times;</button>
          </div>
        </aside>
      }
    }
  `,
  styles: `
    .af {
      --af-accent: var(--color-accent);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1.25rem;
      max-width: 900px;
      margin: 0 auto 1.75rem;
      padding: 0.9rem 1.1rem;
      border: 1px solid color-mix(in srgb, var(--af-accent) 45%, var(--color-border));
      border-left: 3px solid var(--af-accent);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--af-accent) 8%, var(--color-surface));
      color: var(--color-text-muted);
      font-size: 0.88rem;
      text-align: left;
    }
    .af-body { flex: 1 1 360px; display: grid; gap: 0.3rem; }
    .af p { margin: 0; line-height: 1.55; }
    .af strong { color: var(--color-text); }
    .af-label {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--af-accent);
    }
    :host-context(.light-mode) .af-label { color: color-mix(in srgb, var(--af-accent) 70%, #0f172a); }
    .af-actions { display: flex; align-items: center; gap: 0.5rem; }
    .af-back {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--color-text);
      text-decoration: none;
      padding: 0.45rem 0.8rem;
      border: 1px solid var(--color-border-2);
      border-radius: var(--radius-md);
      background: var(--color-surface);
    }
    .af-back:hover { border-color: var(--af-accent); color: var(--color-text); }
    .af-close {
      width: 2rem;
      height: 2rem;
      border: 0;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-dim);
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
    }
    .af-close:hover { color: var(--color-text); background: var(--color-surface); }
    .af-back:focus-visible, .af-close:focus-visible { outline: 2px solid var(--af-accent); outline-offset: 2px; }
  `,
})
export class ArrivedFromBanner implements OnInit {
  /** Route of the tool showing the banner, e.g. "/zero-trust". */
  readonly route = input.required<string>();
  readonly accent = input<string>('var(--color-accent)');
  readonly arrived = output<ArrivedTechnique>();

  private readonly from = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map((q) => q.get('from'))), {
    initialValue: null,
  });

  readonly technique = computed(() => findArrivedTechnique(this.from(), this.route()));
  readonly dismissed = signal(false);

  ngOnInit() {
    const t = this.technique();
    if (t) this.arrived.emit(t);
  }
}
