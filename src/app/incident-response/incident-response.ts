import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DecisionOption,
  GRADE_LABELS,
  Grade,
  IR_PHASE_LABELS,
  IR_PHASE_ORDER,
  IrPhaseId,
  NIST_IR_URL,
  NIST_IR_REV3_URL,
  SCENARIOS,
  Scenario,
  ScenarioId,
} from './incident-response-data';
import { EngagementService } from '../engagement/engagement.service';
import { EngagementTechnique } from '../engagement/engagement.model';

type ViewState = 'select' | 'decision' | 'feedback' | 'debrief';

interface HistoryEntry {
  phase: IrPhaseId;
  option: DecisionOption;
}

export interface ScenarioRecommendation {
  scenarioId: ScenarioId;
  attackId: string;
  techniqueName: string;
}

/** Pick the IR scenario that best matches an engagement's attack chain.
 *  Impact techniques decide first (encryption or recovery inhibition means
 *  ransomware); otherwise the initial-access technique does. Returns null
 *  when nothing in the chain maps to a scenario. */
export function recommendScenario(techniques: EngagementTechnique[]): ScenarioRecommendation | null {
  const rules: { ids: string[]; scenarioId: ScenarioId }[] = [
    { ids: ['T1486', 'T1490'], scenarioId: 'ransomware' },
    { ids: ['T1566'], scenarioId: 'phishing' },
    { ids: ['T1078'], scenarioId: 'insider-threat' },
  ];
  for (const rule of rules) {
    const hit = techniques.find((t) => rule.ids.includes(t.attackId));
    if (hit) return { scenarioId: rule.scenarioId, attackId: hit.attackId, techniqueName: hit.name };
  }
  return null;
}

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

@Component({
  selector: 'app-incident-response',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './incident-response.html',
  styleUrl: './incident-response.css',
})
export class IncidentResponse {
  readonly engagement = inject(EngagementService);
  readonly scenarios = SCENARIOS;

  /** True once this run's decisions have been written to the engagement. */
  addedToEngagement = signal(false);

  /** Scenario matching the active engagement's attack chain, if any. */
  recommended = computed(() => {
    const s = this.engagement.state();
    if (!s || s.isSample) return null;
    return recommendScenario(s.techniques);
  });
  readonly phaseLabels = IR_PHASE_LABELS;
  readonly phaseOrder = IR_PHASE_ORDER;
  readonly gradeLabels = GRADE_LABELS;
  readonly nistIrUrl = NIST_IR_URL;
  readonly nistIrRev3Url = NIST_IR_REV3_URL;

  view = signal<ViewState>('select');
  selectedScenario = signal<Scenario | null>(null);
  phaseIndex = signal(0);
  selectedOptionId = signal<string | null>(null);
  history = signal<HistoryEntry[]>([]);

  currentDecision = computed(() => this.selectedScenario()?.decisions[this.phaseIndex()] ?? null);

  selectedOption = computed(() => {
    const decision = this.currentDecision();
    const id = this.selectedOptionId();
    if (!decision || !id) return null;
    return decision.options.find((o) => o.id === id) ?? null;
  });

  isLastPhase = computed(() => this.phaseIndex() === (this.selectedScenario()?.decisions.length ?? 0) - 1);

  optimalCount = computed(() => this.history().filter((h) => h.option.grade === 'optimal').length);

  ratingLabel = computed(() => {
    const n = this.optimalCount();
    if (n === 3) return 'Strong Response';
    if (n === 2) return 'Good Response';
    return 'Needs Improvement';
  });

  ratingGrade = computed<Grade>(() => {
    const n = this.optimalCount();
    if (n === 3) return 'optimal';
    if (n === 2) return 'suboptimal';
    return 'poor';
  });

  keyLessons = computed(() => {
    const entries = this.history();
    const nonOptimal = entries.filter((h) => h.option.grade !== 'optimal');
    const pool = nonOptimal.length > 0 ? nonOptimal : entries;
    return pool.slice(0, 2);
  });

  stepStatus(phase: IrPhaseId): 'done' | 'current' | 'upcoming' {
    const idx = this.phaseOrder.indexOf(phase);
    if (idx < this.phaseIndex()) return 'done';
    if (idx === this.phaseIndex()) return 'current';
    return 'upcoming';
  }

  startScenario(scenario: Scenario) {
    this.addedToEngagement.set(false);
    this.selectedScenario.set(scenario);
    this.phaseIndex.set(0);
    this.history.set([]);
    this.selectedOptionId.set(null);
    this.view.set('decision');
  }

  pickOption(option: DecisionOption) {
    const decision = this.currentDecision();
    if (!decision) return;
    this.selectedOptionId.set(option.id);
    this.history.update((h) => [...h, { phase: decision.phase, option }]);
    this.view.set('feedback');
  }

  continueSimulation() {
    if (this.isLastPhase()) {
      this.view.set('debrief');
    } else {
      this.phaseIndex.update((i) => i + 1);
      this.selectedOptionId.set(null);
      this.view.set('decision');
    }
  }

  /** Save this run's graded decisions as the engagement's response,
   *  starting an engagement if none is active. */
  addToEngagement() {
    const scenario = this.selectedScenario();
    if (!scenario || this.view() !== 'debrief') return;
    this.engagement.setDecisions(
      this.history().map((h) => ({
        phase: this.phaseLabels[h.phase],
        action: h.option.text,
        grade: h.option.grade,
        rationale: h.option.feedback,
      })),
      scenario.name,
    );
    this.addedToEngagement.set(true);
  }

  restart() {
    this.addedToEngagement.set(false);
    this.selectedScenario.set(null);
    this.phaseIndex.set(0);
    this.history.set([]);
    this.selectedOptionId.set(null);
    this.view.set('select');
  }

  downloadResults() {
    const scenario = this.selectedScenario();
    if (!scenario) return;

    const rows: string[][] = [['Phase', 'Decision', 'Grade', 'Feedback']];
    for (const entry of this.history()) {
      rows.push([
        this.phaseLabels[entry.phase],
        entry.option.text,
        this.gradeLabels[entry.option.grade],
        entry.option.feedback,
      ]);
    }
    rows.push([]);
    rows.push(['Scenario', scenario.name]);
    rows.push(['Overall Rating', this.ratingLabel()]);

    const csv = rows.map((row) => row.map(csvField).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ir-simulation-${scenario.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
