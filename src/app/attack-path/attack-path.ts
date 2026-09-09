import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MITRE_ATTACK_URL, STEALTH_DETECTION_WEIGHT, TACTIC_STAGES, TacticStage, Technique } from './attack-path-data';

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

@Component({
  selector: 'app-attack-path',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './attack-path.html',
  styleUrl: './attack-path.css',
})
export class AttackPath {
  readonly stages = TACTIC_STAGES;
  readonly mitreUrl = MITRE_ATTACK_URL;

  stageIndex = signal(0);
  picks = signal<PathPick[]>([]);

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
  }

  restart() {
    this.stageIndex.set(0);
    this.picks.set([]);
  }
}
