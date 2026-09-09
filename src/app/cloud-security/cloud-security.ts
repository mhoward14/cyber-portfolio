import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORY_LABELS, CloudProviderId, PROVIDERS, ProviderConfig, ResourceConfig } from './cloud-security-data';

const STORAGE_KEY = 'cloud-security-state';

type SettingState = Record<string, boolean>; // `${providerId}:${resourceId}` -> isSecure

function key(providerId: CloudProviderId, resourceId: string): string {
  return `${providerId}:${resourceId}`;
}

function seedState(): SettingState {
  // All resources start in their insecure default -- the point is to fix them.
  const state: SettingState = {};
  for (const provider of PROVIDERS) {
    for (const resource of provider.resources) {
      state[key(provider.id, resource.id)] = false;
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

export interface RatedResource extends ResourceConfig {
  isSecure: boolean;
}

@Component({
  selector: 'app-cloud-security',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cloud-security.html',
  styleUrl: './cloud-security.css',
})
export class CloudSecurity {
  readonly providers = PROVIDERS;
  readonly categoryLabels = CATEGORY_LABELS;

  selectedProviderId = signal<CloudProviderId>('azure');
  selectedResourceId = signal<string>(PROVIDERS[0].resources[0].id);

  private settingState = signal<SettingState>(seedState());

  constructor() {
    const { state, fromStorage } = loadState();
    this.settingState.set(state);
    if (!fromStorage) this.persist();
  }

  currentProvider = computed<ProviderConfig>(
    () => this.providers.find((p) => p.id === this.selectedProviderId()) ?? this.providers[0],
  );

  currentResources = computed<RatedResource[]>(() => {
    const provider = this.currentProvider();
    const state = this.settingState();
    return provider.resources.map((resource) => ({
      ...resource,
      isSecure: state[key(provider.id, resource.id)] ?? false,
    }));
  });

  selectedResource = computed<RatedResource | null>(() => {
    const id = this.selectedResourceId();
    return this.currentResources().find((r) => r.id === id) ?? null;
  });

  secureCount = computed(() => this.currentResources().filter((r) => r.isSecure).length);

  score = computed(() => Math.round((this.secureCount() / this.currentResources().length) * 100));

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

  findings = computed(() => this.currentResources().filter((r) => !r.isSecure));

  selectProvider(providerId: CloudProviderId) {
    this.selectedProviderId.set(providerId);
    const provider = this.providers.find((p) => p.id === providerId) ?? this.providers[0];
    this.selectedResourceId.set(provider.resources[0].id);
  }

  selectResource(resourceId: string) {
    this.selectedResourceId.set(resourceId);
  }

  setSecure(resourceId: string, secure: boolean) {
    const provider = this.currentProvider();
    this.settingState.update((state) => ({ ...state, [key(provider.id, resourceId)]: secure }));
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
