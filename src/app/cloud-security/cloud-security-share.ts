import { packValues, splitCode, unpackValues } from '../share/share-link';
import { CloudProviderId, PROVIDERS } from './cloud-security-data';

export interface CloudShare {
  providerId: CloudProviderId;
  resourceId: string;
  /** `${providerId}:${resourceId}` -> secure */
  settings: Record<string, boolean>;
}

const ALL = PROVIDERS.flatMap((p) => p.resources.map((r) => `${p.id}:${r.id}`));

/** "c1.<provider>.<resource>.<one bit per resource across all providers>" */
export function encodeCloud(s: CloudShare): string {
  const p = PROVIDERS.findIndex((x) => x.id === s.providerId);
  const r = PROVIDERS[p].resources.findIndex((x) => x.id === s.resourceId);
  return `c1.${p}.${Math.max(0, r)}.${packValues(ALL.map((k) => (s.settings[k] ? 1 : 0)), 1)}`;
}

export function decodeCloud(code: string): CloudShare | null {
  const parts = splitCode(code, 'c1', 3);
  if (!parts) return null;
  const provider = PROVIDERS[Number(parts[0])];
  const resource = provider?.resources[Number(parts[1])];
  const bits = unpackValues(parts[2], 1, ALL.length);
  if (!/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1]) || !provider || !resource || !bits) return null;
  return {
    providerId: provider.id,
    resourceId: resource.id,
    settings: Object.fromEntries(ALL.map((k, i) => [k, bits[i] === 1])),
  };
}
