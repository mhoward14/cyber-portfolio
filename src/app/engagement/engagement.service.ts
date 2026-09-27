import { Injectable, computed, signal } from '@angular/core';
import { ENGAGEMENT_STORAGE_KEY, Engagement, EngagementTechnique } from './engagement.model';
import { buildSampleEngagement } from './engagement-sample';

export const DEFAULT_SCENARIO = 'Untitled engagement';

/** Shared state for Engagement Mode. Saved to localStorage so the record
 *  survives page reloads and moving between tools; storage failures
 *  (private windows, blocked storage, prerendering) fall back to memory. */
@Injectable({ providedIn: 'root' })
export class EngagementService {
  readonly state = signal<Engagement | null>(load());
  readonly active = computed(() => this.state() !== null);

  /** Total entries across every slice — shown as the sidebar badge. */
  readonly entryCount = computed(() => {
    const s = this.state();
    if (!s) return 0;
    return s.techniques.length + s.evidence.length + s.decisions.length + s.controls.length + s.poams.length;
  });

  start(scenario = DEFAULT_SCENARIO) {
    this.commit(emptyEngagement(scenario));
  }

  loadSample() {
    this.commit(buildSampleEngagement());
  }

  rename(scenario: string) {
    const s = this.state();
    if (!s) return;
    this.commit({ ...s, scenario: scenario.trim() || DEFAULT_SCENARIO });
  }

  /** Replace the attack chain. Starts a new engagement if none is active,
   *  and turns a sample into the visitor's own record. */
  setTechniques(techniques: EngagementTechnique[], detectionScore: number | null) {
    const base = this.state();
    const s = !base || base.isSample ? emptyEngagement(DEFAULT_SCENARIO) : base;
    this.commit({ ...s, techniques: techniques.map((t) => ({ ...t, defense: { ...t.defense } })), detectionScore });
  }

  end() {
    this.state.set(null);
    try {
      localStorage.removeItem(ENGAGEMENT_STORAGE_KEY);
    } catch {
      /* storage unavailable: in-memory state is already cleared */
    }
  }

  private commit(next: Engagement) {
    this.state.set(next);
    try {
      localStorage.setItem(ENGAGEMENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: keep the in-memory copy for this visit */
    }
  }
}

function emptyEngagement(scenario: string): Engagement {
  return {
    version: 1,
    scenario,
    startedAt: new Date().toISOString(),
    isSample: false,
    techniques: [],
    detectionScore: null,
    evidence: [],
    decisions: [],
    controls: [],
    poams: [],
  };
}

/** Read a saved engagement, discarding anything malformed or from an
 *  incompatible version rather than letting it break the report. */
function load(): Engagement | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(ENGAGEMENT_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const arrays = ['techniques', 'evidence', 'decisions', 'controls', 'poams'];
    if (
      !data ||
      data.version !== 1 ||
      typeof data.scenario !== 'string' ||
      typeof data.startedAt !== 'string' ||
      !arrays.every((k) => Array.isArray(data[k]))
    ) {
      return null;
    }
    return data as Engagement;
  } catch {
    return null;
  }
}
