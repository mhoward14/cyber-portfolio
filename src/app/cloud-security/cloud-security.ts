import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShareBanner, ShareButton, ShareSession } from '../share/share-link';
import { decodeCloud, encodeCloud } from './cloud-security-share';
import { ArrivedFromBanner, ArrivedTechnique } from '../engagement/arrived-from';
import { CATEGORY_LABELS, CloudProviderId, PROVIDERS, ProviderConfig, ResourceCategory, ResourceConfig } from './cloud-security-data';
import { EngagementControlsPanel } from '../engagement/engagement-controls-panel';
import { cloudEngagementControls } from './cloud-security-engagement';

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

/** Attack Path techniques whose mapped defense is a setting in this tool,
 *  and the resource category that holds it. The backup-related techniques
 *  (T1486, T1490) have no matching setting here, so they get the banner
 *  without selecting a resource. */
const TECHNIQUE_CATEGORIES: Record<string, ResourceCategory> = {
  T1190: 'network',
};

@Component({
  selector: 'app-cloud-security',
  standalone: true,
  imports: [RouterLink, EngagementControlsPanel, ArrivedFromBanner, ShareBanner, ShareButton],
  templateUrl: './cloud-security.html',
  styleUrl: './cloud-security.css',
})
export class CloudSecurity {
  readonly providers = PROVIDERS;
  readonly categoryLabels = CATEGORY_LABELS;

  selectedProviderId = signal<CloudProviderId>('azure');
  selectedResourceId = signal<string>(PROVIDERS[0].resources[0].id);

  private settingState = signal<SettingState>(seedState());

  readonly share = new ShareSession();
  shareCode = computed(() =>
    encodeCloud({ providerId: this.selectedProviderId(), resourceId: this.selectedResourceId(), settings: this.settingState() }),
  );

  constructor() {
    const { state, fromStorage } = loadState();
    this.settingState.set(state);
    if (!fromStorage) this.persist();
    this.share.open((code) => {
      const shared = decodeCloud(code);
      if (!shared) return false;
      this.settingState.set(shared.settings);
      this.selectedProviderId.set(shared.providerId);
      this.selectedResourceId.set(shared.resourceId);
      return true;
    });
  }

  keepShared() {
    this.share.close();
    this.persist();
  }

  discardShared() {
    this.share.close();
    this.settingState.set(loadState().state);
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

  /** This provider's settings expressed as NIST 800-53 controls for Engagement Mode. */
  engagementControls = computed(() => {
    const byId = new Map(this.currentResources().map((r) => [r.id, r.isSecure]));
    return cloudEngagementControls(this.currentProvider(), (id) => byId.get(id) ?? false);
  });

  selectProvider(providerId: CloudProviderId) {
    this.selectedProviderId.set(providerId);
    const provider = this.providers.find((p) => p.id === providerId) ?? this.providers[0];
    this.selectedResourceId.set(provider.resources[0].id);
  }

  /** Select the resource that defends against the technique the visitor
   *  followed from the Attack Path Builder. */
  focusFromTechnique(t: ArrivedTechnique) {
    const category = TECHNIQUE_CATEGORIES[t.attackId];
    const resource = category && this.currentProvider().resources.find((r) => r.category === category);
    if (resource) this.selectResource(resource.id);
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
    if (this.share.viewing()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settingState()));
    } catch {
      /* storage unavailable — state just won't persist across reloads */
    }
  }
}
