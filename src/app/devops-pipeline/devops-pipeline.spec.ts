import { DevopsPipeline } from './devops-pipeline';
import { PIPELINE_STAGES } from './devops-pipeline-data';

describe('DevopsPipeline', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds every gate as unconfigured by default, giving a score of 0', () => {
    const cmp = new DevopsPipeline();
    expect(cmp.score()).toBe(0);
    expect(cmp.ratingTier()).toBe('weak');
    expect(cmp.findings().length).toBe(cmp.allGates().length);
  });

  it('raises the overall score and drops a finding when a gate is marked secure', () => {
    const cmp = new DevopsPipeline();
    const gate = cmp.currentStage().gates[0];
    cmp.setSecure(gate.id, true);

    expect(cmp.secureCount()).toBe(1);
    expect(cmp.allGates().find((g) => g.id === gate.id)?.isSecure).toBe(true);
    expect(cmp.findings().find((f) => f.id === gate.id)).toBeUndefined();
  });

  it('reaches a strong rating once every gate across every stage is secure', () => {
    const cmp = new DevopsPipeline();
    for (const gate of cmp.allGates()) {
      cmp.setSecure(gate.id, true);
    }
    expect(cmp.score()).toBe(100);
    expect(cmp.ratingTier()).toBe('strong');
    expect(cmp.findings().length).toBe(0);
  });

  it('keeps the overall score intact when switching stages -- unlike a per-provider/type reset', () => {
    const cmp = new DevopsPipeline();
    const sourceGate = cmp.currentStage().gates[0];
    cmp.setSecure(sourceGate.id, true);
    expect(cmp.score()).toBeGreaterThan(0);

    cmp.selectStage('deploy');
    expect(cmp.selectedStageId()).toBe('deploy');
    expect(cmp.score()).toBeGreaterThan(0);
    expect(cmp.allGates().find((g) => g.id === sourceGate.id)?.isSecure).toBe(true);
  });

  it('computes an independent per-stage score for the pipeline stepper', () => {
    const cmp = new DevopsPipeline();
    const buildStage = cmp.stages.find((s) => s.id === 'build')!;
    for (const gate of buildStage.gates) {
      cmp.setSecure(gate.id, true);
    }
    const rated = cmp.ratedStages().find((s) => s.id === 'build');
    expect(rated?.score).toBe(100);

    const otherStage = cmp.ratedStages().find((s) => s.id === 'test');
    expect(otherStage?.score).toBe(0);
  });

  it('selecting a gate by id also switches to its owning stage', () => {
    const cmp = new DevopsPipeline();
    const deployGateId = 'artifact-signing';
    cmp.selectGate(deployGateId);
    expect(cmp.selectedStageId()).toBe('deploy');
    expect(cmp.selectedGate()?.id).toBe(deployGateId);
  });

  it('persists state to localStorage and reloads it on the next instantiation', () => {
    const first = new DevopsPipeline();
    const gate = first.currentStage().gates[0];
    first.setSecure(gate.id, true);

    const second = new DevopsPipeline();
    expect(second.allGates().find((g) => g.id === gate.id)?.isSecure).toBe(true);
  });

  it('covers all five pipeline stages with at least one gate each', () => {
    expect(PIPELINE_STAGES.map((s) => s.id)).toEqual(['source', 'build', 'test', 'deploy', 'operate']);
    for (const stage of PIPELINE_STAGES) {
      expect(stage.gates.length).toBeGreaterThan(0);
      for (const gate of stage.gates) {
        expect(gate.ssdfPractice).toBeTruthy();
      }
    }
  });
});
