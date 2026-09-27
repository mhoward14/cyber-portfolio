import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EngagementReport, engagementToCsv } from './engagement-report';
import { EngagementService } from './engagement.service';
import { buildSampleEngagement } from './engagement-sample';

describe('EngagementReport', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [EngagementReport],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  const render = async () => {
    const fixture = TestBed.createComponent(EngagementReport);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  };

  it('shows the empty state when no engagement is active', async () => {
    const { el } = await render();
    expect(el.querySelector('.er-empty')).toBeTruthy();
    expect(el.querySelector('.er-kpis')).toBeNull();
  });

  it('renders every populated slice of the sample engagement', async () => {
    TestBed.inject(EngagementService).loadSample();
    const { el } = await render();
    expect(el.querySelector('.er-sample-pill')).toBeTruthy();
    for (const id of ['er-chain-h', 'er-evidence-h', 'er-decisions-h', 'er-controls-h', 'er-poam-h']) {
      expect(el.querySelector('#' + id), id).toBeTruthy();
    }
  });

  it('hides slices that have no data yet', async () => {
    TestBed.inject(EngagementService).setTechniques(buildSampleEngagement().techniques, 60);
    const { el } = await render();
    expect(el.querySelector('#er-chain-h')).toBeTruthy();
    expect(el.querySelector('#er-evidence-h')).toBeNull();
    expect(el.querySelector('#er-poam-h')).toBeNull();
  });

  it('asks for confirmation before ending the engagement', async () => {
    TestBed.inject(EngagementService).loadSample();
    const { fixture } = await render();
    const cmp = fixture.componentInstance;
    cmp.confirmingEnd.set(true);
    cmp.endEngagement();
    expect(TestBed.inject(EngagementService).state()).toBeNull();
  });
});

describe('engagementToCsv', () => {
  it('writes a header plus one row per record', () => {
    const s = buildSampleEngagement();
    const lines = engagementToCsv(s).split('\r\n');
    const records = s.techniques.length + s.evidence.length + s.decisions.length + s.controls.length + s.poams.length;
    expect(lines.length).toBe(records + 1);
    expect(lines[0]).toContain('"Section"');
  });

  it('neutralizes values that a spreadsheet would treat as formulas', () => {
    const s = buildSampleEngagement();
    s.evidence = [{ kind: '=HYPERLINK("x")', value: 'v', detail: 'd' }];
    s.techniques = [];
    s.decisions = [];
    s.controls = [];
    s.poams = [];
    expect(engagementToCsv(s)).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
