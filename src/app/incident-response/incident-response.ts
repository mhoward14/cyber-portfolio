import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DecisionOption,
  GRADE_LABELS,
  Grade,
  IR_PHASE_LABELS,
  IR_PHASE_ORDER,
  IrPhaseId,
  NIST_IR_URL,
  SCENARIOS,
  Scenario,
} from './incident-response-data';

type ViewState = 'select' | 'decision' | 'feedback' | 'debrief';

interface HistoryEntry {
  phase: IrPhaseId;
  option: DecisionOption;
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
  readonly scenarios = SCENARIOS;
  readonly phaseLabels = IR_PHASE_LABELS;
  readonly phaseOrder = IR_PHASE_ORDER;
  readonly gradeLabels = GRADE_LABELS;
  readonly nistIrUrl = NIST_IR_URL;

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

  restart() {
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
