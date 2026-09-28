import { TestBed } from '@angular/core/testing';
import { TransactionSecurity } from './transaction-security';

const create = () => TestBed.runInInjectionContext(() => new TransactionSecurity());
import { TRANSACTION_TYPES } from './transaction-security-data';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { decodeTransaction } from './transaction-security-share';

describe('TransactionSecurity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds every stage as insecure by default, giving a score of 0', () => {
    const cmp = create();
    expect(cmp.score()).toBe(0);
    expect(cmp.ratingTier()).toBe('weak');
    expect(cmp.findings().length).toBe(cmp.currentStages().length);
  });

  it('raises the score and drops a finding when a stage is marked secure', () => {
    const cmp = create();
    const stage = cmp.currentStages()[0];
    cmp.setSecure(stage.id, true);

    expect(cmp.secureCount()).toBe(1);
    expect(cmp.currentStages().find((s) => s.id === stage.id)?.isSecure).toBe(true);
    expect(cmp.findings().find((f) => f.id === stage.id)).toBeUndefined();
  });

  it('reaches a strong rating once every stage in a transaction type is secure', () => {
    const cmp = create();
    for (const stage of cmp.currentStages()) {
      cmp.setSecure(stage.id, true);
    }
    expect(cmp.score()).toBe(100);
    expect(cmp.ratingTier()).toBe('strong');
    expect(cmp.findings().length).toBe(0);
  });

  it('keeps each transaction type\'s settings independent when switching types', () => {
    const cmp = create();
    const cardPresentStage = cmp.currentStages()[0];
    cmp.setSecure(cardPresentStage.id, true);
    expect(cmp.score()).toBeGreaterThan(0);

    cmp.selectType('ach');
    expect(cmp.selectedTypeId()).toBe('ach');
    expect(cmp.score()).toBe(0);

    cmp.selectType('card-present');
    expect(cmp.currentStages().find((s) => s.id === cardPresentStage.id)?.isSecure).toBe(true);
  });

  it('persists state to localStorage and reloads it on the next instantiation', () => {
    const first = create();
    const stage = first.currentStages()[0];
    first.setSecure(stage.id, true);

    const second = create();
    expect(second.currentStages().find((s) => s.id === stage.id)?.isSecure).toBe(true);
  });

  it('covers all three transaction types, each with the same six-stage lifecycle', () => {
    expect(TRANSACTION_TYPES.map((t) => t.id)).toEqual(['card-present', 'card-not-present', 'ach']);
    for (const type of TRANSACTION_TYPES) {
      expect(type.stages.length).toBe(6);
    }
  });

  it('maps card transaction types to PCI DSS and ACH to the NACHA Operating Rules', () => {
    const cardPresent = TRANSACTION_TYPES.find((t) => t.id === 'card-present')!;
    const cardNotPresent = TRANSACTION_TYPES.find((t) => t.id === 'card-not-present')!;
    const ach = TRANSACTION_TYPES.find((t) => t.id === 'ach')!;
    expect(cardPresent.standardName).toContain('PCI');
    expect(cardNotPresent.standardName).toContain('PCI');
    expect(ach.standardName).toContain('NACHA');
  });
});

const sharedRoute = (code: string) => ({
  provide: ActivatedRoute,
  useValue: { snapshot: { queryParamMap: convertToParamMap({ s: code }) } },
});

describe('TransactionSecurity share links', () => {
  beforeEach(() => localStorage.clear());

  it('should round-trip the type and settings, open without saving, and keep on request', () => {
    const cmp = create();
    cmp.selectType('ach');
    for (const s of cmp.currentStages()) cmp.setSecure(s.id, true);
    const code = cmp.shareCode();
    expect(decodeTransaction(code)!.typeId).toBe('ach');
    for (const bad of ['t1.7.AA', 't1.0.A', 't9.0.AAA']) expect(decodeTransaction(bad), bad).toBeNull();

    localStorage.clear();
    create();
    const saved = localStorage.getItem('transaction-security-state');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [sharedRoute(code)] });
    const viewer = create();
    expect(viewer.selectedTypeId()).toBe('ach');
    expect(viewer.currentStages().every((s) => s.isSecure)).toBe(true);
    expect(localStorage.getItem('transaction-security-state')).toBe(saved);
    viewer.keepShared();
    expect(localStorage.getItem('transaction-security-state')).not.toBe(saved);
  });
});
