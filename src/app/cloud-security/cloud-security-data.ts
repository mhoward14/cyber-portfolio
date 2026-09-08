/* ============================================================
   CLOUD-SECURITY-DATA.TS — CLOUD SECURITY CONFIGURATION BUILDER
   Grounded in the CIS Foundations Benchmarks for each of the three
   major providers (CIS Microsoft Azure Foundations Benchmark, CIS
   Amazon Web Services Foundations Benchmark, CIS Google Cloud
   Platform Foundation Benchmark). Exact control numbers shift across
   benchmark versions, so explanations describe the underlying
   practice rather than citing a specific numbered control, except
   where a control is stable and well-known across versions (e.g.
   CIS AWS 4.1's "no security group should allow unrestricted SSH
   ingress"). This tool presents original, illustrative resource
   configurations applying those benchmarks' general practices — it
   is not an official CIS or provider assessment tool. Say so
   plainly in the UI disclaimer.
   ============================================================ */

export type CloudProviderId = 'azure' | 'aws' | 'gcp';
export type ResourceCategory = 'storage' | 'compute' | 'network' | 'identity' | 'secrets';

export interface ResourceConfig {
  id: string;
  name: string;
  category: ResourceCategory;
  settingLabel: string;
  secureValue: string;
  insecureValue: string;
  explanation: string;
}

export interface ProviderConfig {
  id: CloudProviderId;
  name: string;
  shortName: string;
  benchmarkName: string;
  benchmarkUrl: string;
  resources: ResourceConfig[];
}

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  storage: 'Storage',
  compute: 'Compute',
  network: 'Network',
  identity: 'Identity',
  secrets: 'Secrets',
};

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'azure',
    name: 'Microsoft Azure',
    shortName: 'Azure',
    benchmarkName: 'CIS Microsoft Azure Foundations Benchmark',
    benchmarkUrl: 'https://www.cisecurity.org/benchmark/azure',
    resources: [
      {
        id: 'storage-account',
        name: 'Storage Account',
        category: 'storage',
        settingLabel: 'Public blob access',
        secureValue: 'Disabled',
        insecureValue: 'Enabled',
        explanation:
          'Publicly accessible blob containers are one of the most common cloud data-exposure incidents. Restrict public access unless a container is deliberately meant to serve public content.',
      },
      {
        id: 'virtual-machine',
        name: 'Virtual Machine',
        category: 'compute',
        settingLabel: 'OS/data disk encryption',
        secureValue: 'Enabled',
        insecureValue: 'Disabled',
        explanation:
          'Unencrypted disks expose data at rest if the underlying storage is ever compromised or improperly decommissioned.',
      },
      {
        id: 'network-security-group',
        name: 'Network Security Group',
        category: 'network',
        settingLabel: 'Management port exposure (RDP/SSH)',
        secureValue: 'Restricted to known ranges',
        insecureValue: 'Open to the internet (0.0.0.0/0)',
        explanation:
          'Leaving RDP (3389) or SSH (22) open to the entire internet is one of the most common entry points for automated attacks.',
      },
      {
        id: 'rbac-principal',
        name: 'RBAC Principal',
        category: 'identity',
        settingLabel: 'Multi-factor authentication',
        secureValue: 'Enforced',
        insecureValue: 'Not enforced',
        explanation:
          'Credential-only access is vulnerable to phishing and credential-stuffing; MFA is one of the highest-leverage controls available.',
      },
      {
        id: 'key-vault',
        name: 'Key Vault',
        category: 'secrets',
        settingLabel: 'Purge protection',
        secureValue: 'Enabled',
        insecureValue: 'Disabled',
        explanation:
          "Without purge protection, a deleted vault (and its secrets) can be permanently erased before the retention window would otherwise allow recovery.",
      },
    ],
  },
  {
    id: 'aws',
    name: 'Amazon Web Services',
    shortName: 'AWS',
    benchmarkName: 'CIS Amazon Web Services Foundations Benchmark',
    benchmarkUrl: 'https://www.cisecurity.org/benchmark/amazon_web_services',
    resources: [
      {
        id: 's3-bucket',
        name: 'S3 Bucket',
        category: 'storage',
        settingLabel: 'Block Public Access',
        secureValue: 'Enabled',
        insecureValue: 'Disabled',
        explanation:
          'Misconfigured S3 buckets left open to the public are one of the most frequently reported cloud data-exposure incidents.',
      },
      {
        id: 'ec2-instance',
        name: 'EC2 Instance',
        category: 'compute',
        settingLabel: 'EBS volume encryption',
        secureValue: 'Enabled',
        insecureValue: 'Disabled',
        explanation:
          'Unencrypted EBS volumes expose data at rest if a snapshot or volume is ever shared or exposed improperly.',
      },
      {
        id: 'security-group',
        name: 'Security Group',
        category: 'network',
        settingLabel: 'Inbound rule for SSH (22)',
        secureValue: 'Restricted to known ranges',
        insecureValue: 'Open to 0.0.0.0/0',
        explanation:
          'CIS AWS 4.1 flags security groups that allow unrestricted SSH ingress from 0.0.0.0/0 — a direct, well-known attack surface.',
      },
      {
        id: 'iam-user',
        name: 'IAM User',
        category: 'identity',
        settingLabel: 'Multi-factor authentication',
        secureValue: 'Enforced',
        insecureValue: 'Not enforced',
        explanation:
          'The CIS AWS benchmark calls out MFA for the root account and IAM users specifically, because credential-only access to a cloud account is catastrophic if phished.',
      },
      {
        id: 'secrets-manager',
        name: 'Secrets Manager',
        category: 'secrets',
        settingLabel: 'Automatic secret rotation',
        secureValue: 'Enabled',
        insecureValue: 'Disabled',
        explanation:
          'Secrets that never rotate stay valid indefinitely if ever leaked — rotation limits the blast radius of an exposed credential.',
      },
    ],
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    shortName: 'GCP',
    benchmarkName: 'CIS Google Cloud Platform Foundation Benchmark',
    benchmarkUrl: 'https://www.cisecurity.org/benchmark/google_cloud_computing_platform',
    resources: [
      {
        id: 'cloud-storage-bucket',
        name: 'Cloud Storage Bucket',
        category: 'storage',
        settingLabel: 'Public access',
        secureValue: 'Not public',
        insecureValue: 'Allowed (allUsers / allAuthenticatedUsers)',
        explanation:
          'Granting allUsers or allAuthenticatedUsers access to a bucket makes its contents world-readable — a frequent source of accidental data exposure.',
      },
      {
        id: 'compute-engine-vm',
        name: 'Compute Engine VM',
        category: 'compute',
        settingLabel: 'Disk encryption with customer-managed keys',
        secureValue: 'CMEK enabled',
        insecureValue: 'Google-managed only',
        explanation:
          'Customer-managed encryption keys give you control over key rotation and revocation independent of the platform default.',
      },
      {
        id: 'firewall-rule',
        name: 'Firewall Rule',
        category: 'network',
        settingLabel: 'Management port exposure (RDP/SSH)',
        secureValue: 'Restricted to known ranges',
        insecureValue: 'Open to 0.0.0.0/0',
        explanation:
          'A firewall rule allowing SSH or RDP from any source is one of the most common paths into a compromised VM.',
      },
      {
        id: 'iam-member',
        name: 'IAM Member',
        category: 'identity',
        settingLabel: '2-Step Verification',
        secureValue: 'Enforced',
        insecureValue: 'Not enforced',
        explanation:
          'As with any provider, credential-only access is vulnerable to phishing; enforcing 2-Step Verification closes that gap.',
      },
      {
        id: 'cloud-kms-key',
        name: 'Cloud KMS Key',
        category: 'secrets',
        settingLabel: 'Automatic key rotation period',
        secureValue: 'Configured (e.g. every 90 days)',
        insecureValue: 'Not set',
        explanation:
          'A key that never rotates stays valid indefinitely — setting a rotation period limits how long a compromised key stays useful.',
      },
    ],
  },
];
