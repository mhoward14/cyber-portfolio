/* ============================================================
   RMF-SAVED.TS — THE TRACKER'S SAVED ASSESSMENT
   The RMF Control Tracker keeps its baseline, control statuses and
   notes in this browser. Other tools (the SSP generator) read the
   same record, so the shape, the storage key and the checks on stored
   values live here once.
   ============================================================ */

import { CONTROLS, ControlStatus, Tier, TIER_ORDER } from './rmf-data';
import { isPlainObject, oneOf, pickKnown, readStored, shortText } from '../security/stored-state';

export interface TrackerState {
  tier: Tier | null;
  statuses: Record<string, ControlStatus>;
  notes: Record<string, string>;
  sample: boolean;
}

export const RMF_STORAGE_KEY = 'rmf-tracker-state';
const MAX_NOTE_LENGTH = 10_000;

const PARTIAL_NOTES = [
  'Compensating control in place; full implementation targeted next quarter.',
  'Implemented for production; staging environment still pending.',
  'Manual process today — automation ticket filed for next sprint.',
  'Covers primary data center; DR site remediation in progress.'
];
const NA_NOTES = [
  'N/A — system has no wireless interfaces in its authorization boundary.',
  'N/A — function performed by the cloud service provider under the shared responsibility model; see provider ATO.',
  'N/A — no removable media permitted per system design.'
];
const OPEN_NOTES = [
  'Not yet started — scheduled for next assessment cycle.',
  'Awaiting budget approval for tooling before implementation can begin.',
  'Identified during self-assessment; POA&M item drafted.'
];

export function loadTrackerState(): { state: TrackerState; fromStorage: boolean } {
  const saved = readStored(RMF_STORAGE_KEY);
  if (!isPlainObject(saved)) return { state: seedSampleState(), fromStorage: false };
  const ids = new Set(CONTROLS.map((c) => c.id));
  return {
    state: {
      tier: oneOf<Tier>(['low', 'moderate', 'high'])(saved['tier']) ? (saved['tier'] as Tier) : null,
      statuses: pickKnown(saved['statuses'], ids, oneOf<ControlStatus>(['implemented', 'partial', 'not-implemented', 'na'])),
      notes: pickKnown(saved['notes'], ids, shortText(MAX_NOTE_LENGTH)),
      sample: saved['sample'] === true,
    },
    fromStorage: true,
  };
}

/** First-ever visit: seed a plausible in-progress Moderate-baseline assessment
 * so the page opens showing what the tool looks like mid-use, not an all-red
 * empty shell. Deterministic (by index), clearly flagged as sample data, and
 * fully editable — click any control to change it. */
export function seedSampleState(): TrackerState {
  const state: TrackerState = { tier: 'moderate', statuses: {}, notes: {}, sample: true };
  let pIdx = 0, nIdx = 0, oIdx = 0;
  CONTROLS.forEach((c, i) => {
    if (TIER_ORDER[c.baseline] > TIER_ORDER.moderate) return;
    const bucket = i % 10;
    if (bucket <= 5) {
      state.statuses[c.id] = 'implemented';
    } else if (bucket <= 7) {
      state.statuses[c.id] = 'partial';
      state.notes[c.id] = PARTIAL_NOTES[pIdx++ % PARTIAL_NOTES.length];
    } else if (bucket === 8) {
      state.statuses[c.id] = 'na';
      state.notes[c.id] = NA_NOTES[nIdx++ % NA_NOTES.length];
    } else {
      state.statuses[c.id] = 'not-implemented';
      state.notes[c.id] = OPEN_NOTES[oIdx++ % OPEN_NOTES.length];
    }
  });
  return state;
}
