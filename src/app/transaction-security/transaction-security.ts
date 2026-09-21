import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  TRANSACTION_TYPES,
  TransactionStage,
  TransactionTypeConfig,
  TransactionTypeId,
} from './transaction-security-data';

const STORAGE_KEY = 'transaction-security-state';

type SettingState = Record<string, boolean>; // `${typeId}:${stageId}` -> isSecure

function key(typeId: TransactionTypeId, stageId: string): string {
  return `${typeId}:${stageId}`;
}

function seedState(): SettingState {
  // All stages start in their insecure default -- the point is to fix them.
  const state: SettingState = {};
  for (const type of TRANSACTION_TYPES) {
    for (const stage of type.stages) {
      state[key(type.id, stage.id)] = false;
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

export interface RatedStage extends TransactionStage {
  isSecure: boolean;
}

@Component({
  selector: 'app-transaction-security',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './transaction-security.html',
  styleUrl: './transaction-security.css',
})
export class TransactionSecurity {
  readonly types = TRANSACTION_TYPES;

  selectedTypeId = signal<TransactionTypeId>('card-present');
  selectedStageId = signal<string>(TRANSACTION_TYPES[0].stages[0].id);

  private settingState = signal<SettingState>(seedState());

  constructor() {
    const { state, fromStorage } = loadState();
    this.settingState.set(state);
    if (!fromStorage) this.persist();
  }

  currentType = computed<TransactionTypeConfig>(
    () => this.types.find((t) => t.id === this.selectedTypeId()) ?? this.types[0],
  );

  currentStages = computed<RatedStage[]>(() => {
    const type = this.currentType();
    const state = this.settingState();
    return type.stages.map((stage) => ({
      ...stage,
      isSecure: state[key(type.id, stage.id)] ?? false,
    }));
  });

  selectedStage = computed<RatedStage | null>(() => {
    const id = this.selectedStageId();
    return this.currentStages().find((s) => s.id === id) ?? null;
  });

  secureCount = computed(() => this.currentStages().filter((s) => s.isSecure).length);

  score = computed(() => Math.round((this.secureCount() / this.currentStages().length) * 100));

  ratingLabel = computed(() => {
    const s = this.score();
    if (s >= 80) return 'Strong Posture';
    if (s >= 40) return 'Needs Improvement';
    return 'Weak Posture';
  });

  ratingTier = computed<'strong' | 'moderate' | 'weak'>(() => {
    const s = this.score();
    if (s >= 80) return 'strong';
    if (s >= 40) return 'moderate';
    return 'weak';
  });

  findings = computed(() => this.currentStages().filter((s) => !s.isSecure));

  selectType(typeId: TransactionTypeId) {
    this.selectedTypeId.set(typeId);
    const type = this.types.find((t) => t.id === typeId) ?? this.types[0];
    this.selectedStageId.set(type.stages[0].id);
  }

  selectStage(stageId: string) {
    this.selectedStageId.set(stageId);
  }

  setSecure(stageId: string, secure: boolean) {
    const type = this.currentType();
    this.settingState.update((state) => ({ ...state, [key(type.id, stageId)]: secure }));
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settingState()));
    } catch {
      /* storage unavailable — state just won't persist across reloads */
    }
  }
}
