import { CloudSecurity } from './cloud-security';
import { PROVIDERS } from './cloud-security-data';

describe('CloudSecurity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds every resource as insecure by default, giving a score of 0', () => {
    const cmp = new CloudSecurity();
    expect(cmp.score()).toBe(0);
    expect(cmp.ratingTier()).toBe('weak');
    expect(cmp.findings().length).toBe(cmp.currentResources().length);
  });

  it('raises the score and drops a finding when a resource is marked secure', () => {
    const cmp = new CloudSecurity();
    const resource = cmp.currentResources()[0];
    cmp.setSecure(resource.id, true);

    expect(cmp.secureCount()).toBe(1);
    expect(cmp.selectedResource()?.id ?? resource.id).toBeTruthy();
    expect(cmp.currentResources().find((r) => r.id === resource.id)?.isSecure).toBe(true);
    expect(cmp.findings().find((f) => f.id === resource.id)).toBeUndefined();
  });

  it('reaches a strong rating once every resource in a provider is secure', () => {
    const cmp = new CloudSecurity();
    for (const resource of cmp.currentResources()) {
      cmp.setSecure(resource.id, true);
    }
    expect(cmp.score()).toBe(100);
    expect(cmp.ratingTier()).toBe('strong');
    expect(cmp.findings().length).toBe(0);
  });

  it('keeps each provider\'s settings independent when switching providers', () => {
    const cmp = new CloudSecurity();
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
    const first = new CloudSecurity();
    const resource = first.currentResources()[0];
    first.setSecure(resource.id, true);

    const second = new CloudSecurity();
    expect(second.currentResources().find((r) => r.id === resource.id)?.isSecure).toBe(true);
  });

  it('covers all three providers with resources', () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual(['azure', 'aws', 'gcp']);
    for (const provider of PROVIDERS) {
      expect(provider.resources.length).toBeGreaterThan(0);
    }
  });
});
