import { AttackPath } from './attack-path';
import { TACTIC_STAGES } from './attack-path-data';

describe('AttackPath', () => {
  it('starts at the first stage with an empty path', () => {
    const cmp = new AttackPath();
    expect(cmp.stageIndex()).toBe(0);
    expect(cmp.currentStage()?.id).toBe('initial-access');
    expect(cmp.isComplete()).toBe(false);
    expect(cmp.detectionScore()).toBe(0);
  });

  it('advances one stage per selected technique and completes after the last stage', () => {
    const cmp = new AttackPath();
    for (const stage of TACTIC_STAGES) {
      expect(cmp.isComplete()).toBe(false);
      cmp.selectTechnique(stage.techniques[0]);
    }
    expect(cmp.isComplete()).toBe(true);
    expect(cmp.picks().length).toBe(TACTIC_STAGES.length);
  });

  it('computes the detection score as the average stealth-detection weight of picks', () => {
    const cmp = new AttackPath();
    const stage = TACTIC_STAGES[0];
    const lowStealth = stage.techniques.find((t) => t.stealth === 'low');
    expect(lowStealth).toBeDefined();
    cmp.selectTechnique(lowStealth!);
    expect(cmp.detectionScore()).toBe(85);
    expect(cmp.detectionTier()).toBe('noisy');
  });

  it('deduplicates repeated tool/note pairs in mappedDefenses', () => {
    const cmp = new AttackPath();
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
    const cmp = new AttackPath();
    cmp.selectTechnique(TACTIC_STAGES[0].techniques[0]);
    cmp.restart();
    expect(cmp.stageIndex()).toBe(0);
    expect(cmp.picks().length).toBe(0);
    expect(cmp.isComplete()).toBe(false);
  });
});
