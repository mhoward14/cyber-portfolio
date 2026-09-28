import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShareBanner, ShareButton, ShareSession } from '../share/share-link';
import { decodeAttackPath, encodeAttackPath } from './attack-path-share';
import { attackPathCsv } from './attack-path-export';
import { ExportButton, dateStamp, downloadText } from '../share/export-file';
import { MITRE_ATTACK_URL, STEALTH_DETECTION_WEIGHT, TACTIC_STAGES, TacticStage, Technique } from './attack-path-data';
import { EngagementService } from '../engagement/engagement.service';

export interface PathPick {
  stage: TacticStage;
  technique: Technique;
}

export type DetectionTier = 'stealthy' | 'moderate' | 'noisy';

const TIER_LABELS: Record<DetectionTier, string> = {
  stealthy: 'Stealthy',
  moderate: 'Moderate',
  noisy: 'Noisy',
};

const SESSION_KEY = 'attack-path-session';

/** Restore the chain for this browser session, so following a defense link
 *  and coming back doesn't lose it. Unknown technique IDs discard it. */
function loadSession(): PathPick[] {
  try {
    if (typeof sessionStorage === 'undefined') return [];
    const ids: unknown = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]');
    if (!Array.isArray(ids) || ids.length > TACTIC_STAGES.length) return [];
    const picks: PathPick[] = [];
    for (let i = 0; i < ids.length; i++) {
      const stage = TACTIC_STAGES[i];
      const technique = stage.techniques.find((t) => t.id === ids[i]);
      if (!technique) return [];
      picks.push({ stage, technique });
    }
    return picks;
  } catch {
    return [];
  }
}

@Component({
  selector: 'app-attack-path',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink, ShareBanner, ShareButton, ExportButton],
  templateUrl: './attack-path.html',
  styleUrl: './attack-path.css',
})
export class AttackPath {
  readonly engagement = inject(EngagementService);
  readonly stages = TACTIC_STAGES;

  /** True once the current chain has been written to the engagement. */
  addedToEngagement = signal(false);
  readonly mitreUrl = MITRE_ATTACK_URL;

  private readonly restored = loadSession();
  stageIndex = signal(this.restored.length);
  picks = signal<PathPick[]>(this.restored);

  readonly share = new ShareSession();
  /** Link code for a finished chain. */
  shareCode = computed(() => (this.isComplete() ? encodeAttackPath(this.picks()) : null));

  constructor() {
    this.share.open((code) => {
      const picks = decodeAttackPath(code);
      if (!picks) return false;
      this.picks.set(picks);
      this.stageIndex.set(picks.length);
      return true;
    });
  }

  /** Make the shared chain this visitor's own. */
  keepShared() {
    this.share.close();
    this.saveSession();
  }

  /** Return to the chain this visitor had before opening the link. */
  discardShared() {
    const own = loadSession();
    this.picks.set(own);
    this.stageIndex.set(own.length);
    this.addedToEngagement.set(false);
    this.share.close();
  }

  currentStage = computed<TacticStage | null>(() => this.stages[this.stageIndex()] ?? null);
  isComplete = computed(() => this.stageIndex() >= this.stages.length);

  detectionScore = computed(() => {
    const p = this.picks();
    if (p.length === 0) return 0;
    const total = p.reduce((sum, pick) => sum + STEALTH_DETECTION_WEIGHT[pick.technique.stealth], 0);
    return Math.round(total / p.length);
  });

  detectionTier = computed<DetectionTier>(() => {
    const s = this.detectionScore();
    if (s < 40) return 'stealthy';
    if (s < 70) return 'moderate';
    return 'noisy';
  });

  detectionTierLabel = computed(() => TIER_LABELS[this.detectionTier()]);

  mappedDefenses = computed(() => {
    const seen = new Set<string>();
    const list: { technique: Technique; tool: string; route: string; note: string }[] = [];
    for (const pick of this.picks()) {
      const key = `${pick.technique.defense.tool}:${pick.technique.defense.note}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ technique: pick.technique, ...pick.technique.defense });
    }
    return list;
  });

  selectTechnique(technique: Technique) {
    const stage = this.currentStage();
    if (!stage) return;
    this.picks.update((arr) => [...arr, { stage, technique }]);
    this.stageIndex.update((i) => i + 1);
    this.saveSession();
  }

  /** Save the finished chain as the engagement's attack chain, starting an
   *  engagement if none is active. */
  addToEngagement() {
    if (!this.isComplete()) return;
    this.engagement.setTechniques(
      this.picks().map((p) => ({
        attackId: p.technique.attackId,
        name: p.technique.name,
        tactic: p.stage.name,
        stealth: p.technique.stealth,
        defense: { ...p.technique.defense },
      })),
      this.detectionScore(),
    );
    this.addedToEngagement.set(true);
  }

  downloadCsv() {
    if (!this.isComplete()) return;
    downloadText(`attack-path-${dateStamp()}.csv`, attackPathCsv(this.picks(), this.detectionScore(), this.detectionTierLabel()));
  }

  restart() {
    this.stageIndex.set(0);
    this.picks.set([]);
    this.addedToEngagement.set(false);
    this.saveSession();
  }

  private saveSession() {
    if (this.share.viewing()) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.picks().map((p) => p.technique.id)));
    } catch {
      /* storage unavailable: the chain just won't survive navigation */
    }
  }
}
