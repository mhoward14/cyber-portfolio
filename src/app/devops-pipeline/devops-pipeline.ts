import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GateConfig, PIPELINE_STAGES, SSDF_NAME, SSDF_URL, StageConfig, StageId } from './devops-pipeline-data';

const STORAGE_KEY = 'devops-pipeline-state';

type SettingState = Record<string, boolean>; // gateId -> isSecure

function seedState(): SettingState {
  // Every gate starts unconfigured -- the point is to enable them.
  const state: SettingState = {};
  for (const stage of PIPELINE_STAGES) {
    for (const gate of stage.gates) {
      state[gate.id] = false;
    }
  }
  return state;
}

function loadState(): { state: SettingState; fromStorage: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) return { state: saved, fromStorage: true };
  } catch {
    /* ignore malformed storage */
  }
  return { state: seedState(), fromStorage: false };
}

export interface RatedGate extends GateConfig {
  isSecure: boolean;
}

export interface RatedStage extends Omit<StageConfig, 'gates'> {
  gates: RatedGate[];
  secureCount: number;
  score: number;
}

@Component({
  selector: 'app-devops-pipeline',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './devops-pipeline.html',
  styleUrl: './devops-pipeline.css',
})
export class DevopsPipeline {
  readonly stages = PIPELINE_STAGES;
  readonly ssdfUrl = SSDF_URL;
  readonly ssdfName = SSDF_NAME;

  selectedStageId = signal<StageId>(PIPELINE_STAGES[0].id);
  selectedGateId = signal<string>(PIPELINE_STAGES[0].gates[0].id);

  private settingState = signal<SettingState>(seedState());

  constructor() {
    const { state, fromStorage } = loadState();
    this.settingState.set(state);
    if (!fromStorage) this.persist();
  }

  ratedStages = computed<RatedStage[]>(() => {
    const state = this.settingState();
    return this.stages.map((stage) => {
      const gates = stage.gates.map((gate) => ({ ...gate, isSecure: state[gate.id] ?? false }));
      const secureCount = gates.filter((g) => g.isSecure).length;
      return { ...stage, gates, secureCount, score: Math.round((secureCount / gates.length) * 100) };
    });
  });

  currentStage = computed<RatedStage>(
    () => this.ratedStages().find((s) => s.id === this.selectedStageId()) ?? this.ratedStages()[0],
  );

  allGates = computed<RatedGate[]>(() => this.ratedStages().flatMap((s) => s.gates));

  selectedGate = computed<RatedGate | null>(() => {
    const id = this.selectedGateId();
    return this.allGates().find((g) => g.id === id) ?? null;
  });

  secureCount = computed(() => this.allGates().filter((g) => g.isSecure).length);

  score = computed(() => Math.round((this.secureCount() / this.allGates().length) * 100));

  ratingLabel = computed(() => {
    const s = this.score();
    if (s >= 80) return 'Shift-Left Maturity: Strong';
    if (s >= 40) return 'Shift-Left Maturity: Developing';
    return 'Shift-Left Maturity: Ad Hoc';
  });

  ratingTier = computed<'strong' | 'moderate' | 'weak'>(() => {
    const s = this.score();
    if (s >= 80) return 'strong';
    if (s >= 40) return 'moderate';
    return 'weak';
  });

  findings = computed(() => this.allGates().filter((g) => !g.isSecure));

  selectStage(stageId: StageId) {
    this.selectedStageId.set(stageId);
    const stage = this.stages.find((s) => s.id === stageId) ?? this.stages[0];
    this.selectedGateId.set(stage.gates[0].id);
  }

  selectGate(gateId: string) {
    this.selectedGateId.set(gateId);
    const stage = this.stages.find((s) => s.gates.some((g) => g.id === gateId));
    if (stage) this.selectedStageId.set(stage.id);
  }

  setSecure(gateId: string, secure: boolean) {
    this.settingState.update((state) => ({ ...state, [gateId]: secure }));
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settingState()));
    } catch {
      /* storage unavailable -- state just won't persist across reloads */
    }
  }
}
