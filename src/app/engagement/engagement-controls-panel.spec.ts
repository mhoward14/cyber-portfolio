import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EngagementControlsPanel } from './engagement-controls-panel';
import { EngagementService } from './engagement.service';
import { makeControl } from './control-catalog';

const ctrl = (status: 'implemented' | 'planned') =>
  makeControl({ id: 'SC-7', status, sourceTool: 'Zero Trust', sourceKey: 'zero-trust', basis: 'Network pillar' });

describe('EngagementControlsPanel', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [EngagementControlsPanel],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  const create = (status: 'implemented' | 'planned' = 'implemented') => {
    const fixture = TestBed.createComponent(EngagementControlsPanel);
    fixture.componentRef.setInput('sourceKey', 'zero-trust');
    fixture.componentRef.setInput('controls', [ctrl(status)]);
    fixture.detectChanges();
    return fixture;
  };

  it('offers to start an engagement when none is active', () => {
    expect(create().componentInstance.status()).toBe('start');
  });

  it('reports saved, then stale after the settings change', () => {
    const fixture = create('implemented');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.status()).toBe('saved');
    fixture.componentRef.setInput('controls', [ctrl('planned')]);
    expect(fixture.componentInstance.status()).toBe('stale');
  });

  it('only replaces its own tool\'s controls', () => {
    const svc = TestBed.inject(EngagementService);
    svc.setControls('cloud-security', [
      makeControl({ id: 'AC-3', status: 'planned', sourceTool: 'Cloud Security (AWS)', sourceKey: 'cloud-security', basis: 'b' }),
    ]);
    create().componentInstance.save();
    expect(svc.state()!.controls.map((c) => c.sourceKey).sort()).toEqual(['cloud-security', 'zero-trust']);
  });
});
