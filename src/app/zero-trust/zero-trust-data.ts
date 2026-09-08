/* ============================================================
   ZERO-TRUST-DATA.TS — ZERO TRUST CLOUD ARCHITECTURE EXPLORER
   A curated, illustrative 5-node request flow grounded in NIST SP
   800-207 (Zero Trust Architecture) — public domain, U.S. government
   work. Principle text below is original paraphrase, not verbatim
   NIST text. The 5-node flow and 3-provider set are a simplified
   teaching model, not an exhaustive or prescriptive architecture —
   real deployments vary significantly by organization.

   Responsibility/rationale are keyed by deployment model only (not a
   full provider × model cross-product): the shared-responsibility
   split is provider-agnostic by definition — only the concrete
   service that plays each role changes per provider.
   ============================================================ */

export type Provider = 'aws' | 'azure' | 'gcp';
export type DeploymentModel = 'iaas' | 'paas' | 'saas';
export type Responsibility = 'customer' | 'shared' | 'provider';

export interface ZeroTrustNode {
  id: string;
  order: number;
  name: string;
  principle: string;
  services: Record<Provider, string>;
  responsibilityByModel: Record<DeploymentModel, Responsibility>;
  rationaleByModel: Record<DeploymentModel, string>;
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'Google Cloud',
};

export const MODEL_LABELS: Record<DeploymentModel, string> = {
  iaas: 'IaaS',
  paas: 'PaaS',
  saas: 'SaaS',
};

export const RESPONSIBILITY_LABELS: Record<Responsibility, string> = {
  customer: 'Customer-Configured',
  shared: 'Shared Responsibility',
  provider: 'Provider-Managed',
};

export const NIST_ZT_URL = 'https://csrc.nist.gov/pubs/sp/800/207/final';

export const PROVIDER_DOC_URLS: Record<Provider, string> = {
  aws: 'https://aws.amazon.com/security/zero-trust/',
  azure: 'https://www.microsoft.com/en-us/security/business/zero-trust',
  gcp: 'https://cloud.google.com/beyondcorp',
};

export const ZERO_TRUST_NODES: ZeroTrustNode[] = [
  {
    id: 'identity',
    order: 1,
    name: 'Identity Provider',
    principle:
      "Zero Trust treats identity as the primary signal for access — every request is authenticated and " +
      "authorized based on who (or what) is asking, continuously, rather than trusting a device just because " +
      "it's inside a 'trusted' network segment.",
    services: {
      aws: 'IAM Identity Center',
      azure: 'Microsoft Entra ID',
      gcp: 'Cloud Identity',
    },
    responsibilityByModel: {
      iaas: 'customer',
      paas: 'shared',
      saas: 'shared',
    },
    rationaleByModel: {
      iaas: 'You stand up and operate your own identity provider; the cloud only supplies compute, not your access decisions.',
      paas: 'The platform offers a managed identity/SSO service, but you still configure federation, MFA enforcement, and conditional access policy.',
      saas: "The vendor operates the identity backend behind their app, but you still own your directory, SSO integration, and access policies into it.",
    },
  },
  {
    id: 'device',
    order: 2,
    name: 'Device',
    principle:
      'Access decisions incorporate the real-time security posture of the requesting device — patch level, ' +
      'configuration, and observable state are checked before trust is extended, not assumed from ownership alone.',
    services: {
      aws: 'Verified Access (device trust signals)',
      azure: 'Intune + Conditional Access',
      gcp: 'Endpoint Verification + Context-Aware Access',
    },
    responsibilityByModel: {
      iaas: 'customer',
      paas: 'customer',
      saas: 'customer',
    },
    rationaleByModel: {
      iaas: 'Device posture is assessed by your own MDM/EDR tooling — the cloud provider has no visibility into devices connecting to your workloads.',
      paas: "Same as IaaS — managing your fleet's health signals stays your job even when the platform itself is managed.",
      saas: "Even against a fully managed SaaS app, it's still your device fleet whose posture needs to be verified before access is granted.",
    },
  },
  {
    id: 'pep',
    order: 3,
    name: 'Policy Enforcement Point',
    principle:
      'All access to a resource is mediated through a single enforcement point that evaluates a policy decision ' +
      'before every request — there is no way to reach a protected resource by simply being on the right network segment.',
    services: {
      aws: 'AWS Verified Access',
      azure: 'Azure AD Application Proxy + Conditional Access',
      gcp: 'Identity-Aware Proxy (IAP)',
    },
    responsibilityByModel: {
      iaas: 'customer',
      paas: 'shared',
      saas: 'provider',
    },
    rationaleByModel: {
      iaas: 'You deploy and configure the enforcement gateway yourself, choosing what policy each request is checked against.',
      paas: 'The platform provides a managed proxy/gateway primitive; you still write and maintain the access policy it enforces.',
      saas: "The vendor's application already enforces access at its own front door — you only decide who's allowed in, not how enforcement works.",
    },
  },
  {
    id: 'workload',
    order: 4,
    name: 'Workload / Application',
    principle:
      'Access is granted per-session and scoped to the minimum resource needed for that specific request, with the ' +
      "environment segmented so that compromising one workload doesn't hand an attacker a path to everything else.",
    services: {
      aws: 'Security Groups + VPC Lattice',
      azure: 'NSGs + Private Link',
      gcp: 'VPC Service Controls',
    },
    responsibilityByModel: {
      iaas: 'customer',
      paas: 'shared',
      saas: 'provider',
    },
    rationaleByModel: {
      iaas: 'You own network segmentation and per-resource access rules — nothing is isolated unless you configure it.',
      paas: 'The platform isolates the runtime environment for you, but you still scope which identities can reach which service.',
      saas: 'The vendor operates and segments the application tier entirely — your role is limited to assigning user permissions within it.',
    },
  },
  {
    id: 'data',
    order: 5,
    name: 'Data',
    principle:
      'Protection is applied to the data itself — through classification, encryption, and access policy — so it ' +
      'stays protected regardless of which network, device, or location it’s accessed from.',
    services: {
      aws: 'KMS + Macie',
      azure: 'Purview + Key Vault',
      gcp: 'Cloud DLP + Cloud KMS',
    },
    responsibilityByModel: {
      iaas: 'customer',
      paas: 'shared',
      saas: 'shared',
    },
    rationaleByModel: {
      iaas: 'You choose encryption, classification, and access policy for data you store — the provider only supplies the storage primitive.',
      paas: 'The platform manages encryption-at-rest infrastructure, but you still classify data and set who/what can access it.',
      saas: 'The vendor secures the underlying data store, but you still decide retention, sharing, and access-control settings for your data within it.',
    },
  },
];
