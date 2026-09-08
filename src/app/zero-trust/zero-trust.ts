import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ATTACK_PATH_DOWNSTREAM,
  DOD_ZT_STRATEGY_URL,
  DeploymentModel,
  MATURITY_PILLARS,
  MATURITY_STAGE_LABELS,
  MODEL_LABELS,
  MaturityPillar,
  MaturityStage,
  NIST_ZT_URL,
  PROVIDER_DOC_URLS,
  PROVIDER_LABELS,
  Provider,
  RESPONSIBILITY_LABELS,
  Responsibility,
  ZERO_TRUST_NODES,
  ZeroTrustNode,
  ZtPillarId,
} from './zero-trust-data';

type ZtTab = 'flow' | 'attack-path' | 'maturity';

const MATURITY_STORAGE_KEY = 'zero-trust-maturity-state';

interface MaturityState {
  stages: Record<ZtPillarId, MaturityStage>;
}

function seedMaturityState(): MaturityState {
  return {
    stages: {
      user: 'advanced',
      device: 'target',
      network: 'target',
      apps: 'not-started',
      data: 'advanced',
      automation: 'not-started',
      visibility: 'target',
    },
  };
}

function loadMaturityState(): { state: MaturityState; fromStorage: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(MATURITY_STORAGE_KEY) || 'null');
    if (saved) return { state: saved, fromStorage: true };
  } catch {
    /* ignore malformed storage */
  }
  return { state: seedMaturityState(), fromStorage: false };
}

const AXIS_COUNT = 7;
const CENTER = 150;
const OUTER_R = 100;
const LABEL_R = 122;

const STAGE_RADIUS: Record<MaturityStage, number> = {
  'not-started': 10,
  target: 55,
  advanced: 100,
};

interface Point {
  x: number;
  y: number;
}

function axisPoint(index: number, radius: number): Point {
  const angle = (-90 + index * (360 / AXIS_COUNT)) * (Math.PI / 180);
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

function toPointsAttr(pts: Point[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

@Component({
  selector: 'app-zero-trust',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './zero-trust.html',
  styleUrl: './zero-trust.css',
})
export class ZeroTrust {
  // ---- Flow tab (unchanged) ----
  readonly nodes = ZERO_TRUST_NODES;
  readonly providerLabels = PROVIDER_LABELS;
  readonly modelLabels = MODEL_LABELS;
  readonly responsibilityLabels = RESPONSIBILITY_LABELS;
  readonly providerDocUrls = PROVIDER_DOC_URLS;
  readonly nistZtUrl = NIST_ZT_URL;
  readonly providers: Provider[] = ['aws', 'azure', 'gcp'];
  readonly models: DeploymentModel[] = ['iaas', 'paas', 'saas'];

  provider = signal<Provider>('aws');
  model = signal<DeploymentModel>('iaas');
  selectedNode = signal<ZeroTrustNode | null>(null);

  orderedProviders = computed<Provider[]>(() => {
    const p = this.provider();
    return [p, ...this.providers.filter((x) => x !== p)];
  });

  setProvider(p: Provider) {
    this.provider.set(p);
  }

  setModel(m: DeploymentModel) {
    this.model.set(m);
  }

  openNode(node: ZeroTrustNode) {
    this.selectedNode.set(node);
  }

  closeNode() {
    this.selectedNode.set(null);
  }

  responsibilityOf(node: ZeroTrustNode): Responsibility {
    return node.responsibilityByModel[this.model()];
  }

  // ---- Tabs ----
  activeTab = signal<ZtTab>('flow');

  setTab(tab: ZtTab) {
    this.activeTab.set(tab);
  }

  // ---- Attack Path tab ----
  readonly attackPathDownstream = ATTACK_PATH_DOWNSTREAM;

  // ---- Maturity tab ----
  readonly pillars = MATURITY_PILLARS;
  readonly stageLabels = MATURITY_STAGE_LABELS;
  readonly stages: MaturityStage[] = ['not-started', 'target', 'advanced'];
  readonly dodZtStrategyUrl = DOD_ZT_STRATEGY_URL;

  private loadedMaturity = loadMaturityState();
  maturityStages = signal<Record<ZtPillarId, MaturityStage>>(this.loadedMaturity.state.stages);

  readonly axisGrid = this.pillars.map((_, i) => axisPoint(i, OUTER_R));
  readonly targetRing = this.pillars.map((_, i) => axisPoint(i, STAGE_RADIUS.target));
  readonly outerRingPoints = toPointsAttr(this.axisGrid);
  readonly targetRingPoints = toPointsAttr(this.targetRing);
  readonly labelPositions = this.pillars.map((p, i) => ({ pillar: p, ...axisPoint(i, LABEL_R) }));

  constructor() {
    if (!this.loadedMaturity.fromStorage) {
      this.persistMaturity();
    }
  }

  stageOf(pillar: MaturityPillar): MaturityStage {
    return this.maturityStages()[pillar.id];
  }

  setStage(pillar: MaturityPillar, stage: MaturityStage) {
    this.maturityStages.update((s) => ({ ...s, [pillar.id]: stage }));
    this.persistMaturity();
  }

  radarPolygonPoints = computed(() =>
    toPointsAttr(this.pillars.map((p, i) => axisPoint(i, STAGE_RADIUS[this.stageOf(p)])))
  );

  maturityProfileSummary = computed(() => {
    const stages = this.maturityStages();
    const counts = { 'not-started': 0, target: 0, advanced: 0 } as Record<MaturityStage, number>;
    for (const pillar of this.pillars) {
      counts[stages[pillar.id]]++;
    }
    return counts;
  });

  nextSteps = computed(() =>
    this.pillars
      .filter((p) => this.stageOf(p) !== 'advanced')
      .map((p) => ({ pillar: p, stage: this.stageOf(p), text: p.recommendations[this.stageOf(p)] }))
  );

  private persistMaturity() {
    const state: MaturityState = { stages: this.maturityStages() };
    try {
      localStorage.setItem(MATURITY_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — state just won't persist across reloads */
    }
  }
}
