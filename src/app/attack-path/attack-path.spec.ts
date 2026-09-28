import { TestBed } from '@angular/core/testing';
import { AttackPath } from './attack-path';
import { TACTIC_STAGES } from './attack-path-data';
import { EngagementService } from '../engagement/engagement.service';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { decodeAttackPath, encodeAttackPath } from './attack-path-share';

// AttackPath injects EngagementService, so build it in an injection context.
const create = () => TestBed.runInInjectionContext(() => new AttackPath());

describe('AttackPath', () => {
  beforeEach(() => sessionStorage.clear());

  it('starts at the first stage with an empty path', () => {
    const cmp = create();
    expect(cmp.stageIndex()).toBe(0);
    expect(cmp.currentStage()?.id).toBe('initial-access');
    expect(cmp.isComplete()).toBe(false);
    expect(cmp.detectionScore()).toBe(0);
  });

  it('advances one stage per selected technique and completes after the last stage', () => {
    const cmp = create();
    for (const stage of TACTIC_STAGES) {
      expect(cmp.isComplete()).toBe(false);
      cmp.selectTechnique(stage.techniques[0]);
    }
    expect(cmp.isComplete()).toBe(true);
    expect(cmp.picks().length).toBe(TACTIC_STAGES.length);
  });

  it('computes the detection score as the average stealth-detection weight of picks', () => {
    const cmp = create();
    const stage = TACTIC_STAGES[0];
    const lowStealth = stage.techniques.find((t) => t.stealth === 'low');
    expect(lowStealth).toBeDefined();
    cmp.selectTechnique(lowStealth!);
    expect(cmp.detectionScore()).toBe(85);
    expect(cmp.detectionTier()).toBe('noisy');
  });

  it('deduplicates repeated tool/note pairs in mappedDefenses', () => {
    const cmp = create();
    for (const stage of TACTIC_STAGES) {
      cmp.selectTechnique(stage.techniques[0]);
    }
    const defenses = cmp.mappedDefenses();
    const keys = defenses.map((d) => `${d.tool}:${d.note}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('links the Financial Theft technique to the Transaction Security tool', () => {
    const impactStage = TACTIC_STAGES.find((s) => s.id === 'impact')!;
    const financialTheft = impactStage.techniques.find((t) => t.id === 'financial-theft');
    expect(financialTheft).toBeDefined();
    expect(financialTheft?.attackId).toBe('T1657');
    expect(financialTheft?.defense.tool).toBe('Transaction Security');
    expect(financialTheft?.defense.route).toBe('/transaction-security');
  });

  it('resets to the first stage with an empty path on restart', () => {
    const cmp = create();
    cmp.selectTechnique(TACTIC_STAGES[0].techniques[0]);
    cmp.restart();
    expect(cmp.stageIndex()).toBe(0);
    expect(cmp.picks().length).toBe(0);
    expect(cmp.isComplete()).toBe(false);
  });
});

describe('AttackPath engagement hand-off', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('writes the finished chain and detection score to the engagement', () => {
    const cmp = TestBed.runInInjectionContext(() => new AttackPath());
    for (const stage of TACTIC_STAGES) cmp.selectTechnique(stage.techniques[0]);
    cmp.addToEngagement();
    const s = TestBed.inject(EngagementService).state()!;
    expect(s.techniques.map((t) => t.attackId)).toEqual(TACTIC_STAGES.map((st) => st.techniques[0].attackId));
    expect(s.detectionScore).toBe(cmp.detectionScore());
    expect(cmp.addedToEngagement()).toBe(true);
  });

  it('does nothing before the chain is complete', () => {
    const cmp = TestBed.runInInjectionContext(() => new AttackPath());
    cmp.selectTechnique(TACTIC_STAGES[0].techniques[0]);
    cmp.addToEngagement();
    expect(TestBed.inject(EngagementService).state()).toBeNull();
  });
});

describe('AttackPath session', () => {
  beforeEach(() => sessionStorage.clear());

  it('restores the chain after navigating away and back', () => {
    const first = create();
    first.selectTechnique(TACTIC_STAGES[0].techniques[1]);
    first.selectTechnique(TACTIC_STAGES[1].techniques[0]);
    const second = create();
    expect(second.stageIndex()).toBe(2);
    expect(second.picks().map((p) => p.technique.id)).toEqual([
      TACTIC_STAGES[0].techniques[1].id,
      TACTIC_STAGES[1].techniques[0].id,
    ]);
  });

  it('discards a saved chain with unknown techniques', () => {
    sessionStorage.setItem('attack-path-session', JSON.stringify(['not-a-technique']));
    expect(create().picks().length).toBe(0);
  });

  it('clears the saved chain on restart', () => {
    const cmp = create();
    cmp.selectTechnique(TACTIC_STAGES[0].techniques[0]);
    cmp.restart();
    expect(create().picks().length).toBe(0);
  });
});

const sharedRoute = (code: string) => ({
  provide: ActivatedRoute,
  useValue: { snapshot: { queryParamMap: convertToParamMap({ s: code }) } },
});

describe('AttackPath share links', () => {
  beforeEach(() => sessionStorage.clear());

  const finish = (ap: AttackPath, pick: number) => {
    for (const stage of TACTIC_STAGES) ap.selectTechnique(stage.techniques[Math.min(pick, stage.techniques.length - 1)]);
  };

  it('should round-trip a chain and reject malformed codes', () => {
    const ap = create();
    finish(ap, 1);
    const code = ap.shareCode()!;
    expect(code).toMatch(/^a1\.\d{6}$/);
    expect(decodeAttackPath(code)!.map((p) => p.technique.id)).toEqual(ap.picks().map((p) => p.technique.id));
    for (const bad of ['a1.9', 'a1.0000000', 'a2.000000', 'a1.', 'a1.0x']) expect(decodeAttackPath(bad), bad).toBeNull();
    expect(encodeAttackPath([])).toBe('a1.');
  });

  it('should show a shared chain without touching the visitor’s own until kept', () => {
    const own = create();
    finish(own, 0);
    const ownIds = own.picks().map((p) => p.technique.id);
    const other = create();
    other.restart();
    finish(other, 1);
    const code = other.shareCode()!;
    other.restart();
    finish(other, 0);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [sharedRoute(code)] });
    const viewer = create();
    expect(viewer.share.viewing()).toBe(true);
    expect(viewer.isComplete()).toBe(true);
    expect(encodeAttackPath(viewer.picks())).toBe(code);
    expect(JSON.parse(sessionStorage.getItem('attack-path-session')!)).toEqual(ownIds);

    viewer.discardShared();
    expect(viewer.picks().map((p) => p.technique.id)).toEqual(ownIds);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [sharedRoute(code)] });
    const keeper = create();
    keeper.keepShared();
    expect(keeper.share.viewing()).toBe(false);
    expect(JSON.parse(sessionStorage.getItem('attack-path-session')!)).toEqual(keeper.picks().map((p) => p.technique.id));
  });
});
