import { TestBed } from '@angular/core/testing';
import { CloudSecurity } from './cloud-security';

const create = () => TestBed.runInInjectionContext(() => new CloudSecurity());
import { PROVIDERS } from './cloud-security-data';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { decodeCloud, encodeCloud } from './cloud-security-share';
import { cloudSecurityCsv } from './cloud-security-export';

describe('CloudSecurity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds every resource as insecure by default, giving a score of 0', () => {
    const cmp = create();
    expect(cmp.score()).toBe(0);
    expect(cmp.ratingTier()).toBe('weak');
    expect(cmp.findings().length).toBe(cmp.currentResources().length);
  });

  it('raises the score and drops a finding when a resource is marked secure', () => {
    const cmp = create();
    const resource = cmp.currentResources()[0];
    cmp.setSecure(resource.id, true);

    expect(cmp.secureCount()).toBe(1);
    expect(cmp.selectedResource()?.id ?? resource.id).toBeTruthy();
    expect(cmp.currentResources().find((r) => r.id === resource.id)?.isSecure).toBe(true);
    expect(cmp.findings().find((f) => f.id === resource.id)).toBeUndefined();
  });

  it('reaches a strong rating once every resource in a provider is secure', () => {
    const cmp = create();
    for (const resource of cmp.currentResources()) {
      cmp.setSecure(resource.id, true);
    }
    expect(cmp.score()).toBe(100);
    expect(cmp.ratingTier()).toBe('strong');
    expect(cmp.findings().length).toBe(0);
  });

  it('keeps each provider\'s settings independent when switching providers', () => {
    const cmp = create();
    const azureResource = cmp.currentResources()[0];
    cmp.setSecure(azureResource.id, true);
    expect(cmp.score()).toBeGreaterThan(0);

    cmp.selectProvider('aws');
    expect(cmp.selectedProviderId()).toBe('aws');
    expect(cmp.score()).toBe(0);

    cmp.selectProvider('azure');
    expect(cmp.currentResources().find((r) => r.id === azureResource.id)?.isSecure).toBe(true);
  });

  it('persists state to localStorage and reloads it on the next instantiation', () => {
    const first = create();
    const resource = first.currentResources()[0];
    first.setSecure(resource.id, true);

    const second = create();
    expect(second.currentResources().find((r) => r.id === resource.id)?.isSecure).toBe(true);
  });

  it('covers all three providers with resources', () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual(['azure', 'aws', 'gcp']);
    for (const provider of PROVIDERS) {
      expect(provider.resources.length).toBeGreaterThan(0);
    }
  });
});

describe('CloudSecurity focus from an Attack Path link', () => {
  it('selects the resource that defends against the technique', () => {
    localStorage.clear();
    const cs = create();
    cs.focusFromTechnique({ attackId: 'T1190', name: '', tactic: '', note: '' });
    expect(cs.selectedResource()!.category).toBe('network');
    cs.focusFromTechnique({ attackId: 'T1486', name: '', tactic: '', note: '' });
    expect(cs.selectedResource()!.category).toBe('network'); // no backup setting: selection unchanged
  });
});

const sharedRoute = (code: string) => ({
  provide: ActivatedRoute,
  useValue: { snapshot: { queryParamMap: convertToParamMap({ s: code }) } },
});

describe('CloudSecurity share links', () => {
  beforeEach(() => localStorage.clear());

  it('should round-trip provider, resource, and every setting', () => {
    const cmp = create();
    cmp.selectProvider('gcp');
    const r = cmp.currentProvider().resources[2];
    cmp.selectResource(r.id);
    cmp.setSecure(r.id, true);
    const decoded = decodeCloud(cmp.shareCode())!;
    expect(decoded.providerId).toBe('gcp');
    expect(decoded.resourceId).toBe(r.id);
    expect(encodeCloud(decoded)).toBe(cmp.shareCode());
    for (const bad of ['c1.9.0.AAA', 'c1.0.9.AAA', 'c1.0.0.A', 'x1.0.0.AAA']) expect(decodeCloud(bad), bad).toBeNull();
  });

  it('should show a shared configuration without saving it, then keep or discard it', () => {
    const own = create();
    const saved = localStorage.getItem('cloud-security-state');
    const other = create();
    for (const r of other.currentProvider().resources) other.setSecure(r.id, true);
    const code = other.shareCode();
    localStorage.setItem('cloud-security-state', saved!);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [sharedRoute(code)] });
    const viewer = create();
    expect(viewer.share.viewing()).toBe(true);
    expect(viewer.score()).toBe(100);
    viewer.setSecure(viewer.currentProvider().resources[0].id, false);
    expect(localStorage.getItem('cloud-security-state')).toBe(saved);
    viewer.discardShared();
    expect(viewer.score()).toBe(own.score());

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [sharedRoute(code)] });
    const keeper = create();
    keeper.keepShared();
    expect(create().score()).toBe(100);
  });
});

describe('CloudSecurity CSV export', () => {
  it('should list every resource for all providers with the current value and status', () => {
    localStorage.clear();
    const cs = create();
    const r = cs.currentProvider().resources[0];
    cs.setSecure(r.id, true);
    const csv = cloudSecurityCsv(Object.fromEntries(PROVIDERS.flatMap((p) => p.resources.map((x) => [`${p.id}:${x.id}`, p.id === cs.currentProvider().id && x.id === r.id]))));
    const rows = PROVIDERS.reduce((n, p) => n + p.resources.length, 0);
    expect(csv.split('\r\n').length).toBe(2 + PROVIDERS.length + 2 + rows);
    expect(csv).toContain(`"${r.secureValue}","${r.secureValue}","Secure"`);
    expect(csv.match(/"Finding"/g)!.length).toBe(rows - 1);
  });
});
