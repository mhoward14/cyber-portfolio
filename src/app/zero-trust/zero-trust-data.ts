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
  pitfall: string;
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
    pitfall:
      'Granting broad, standing access at first login and never re-evaluating it — Zero Trust calls for ' +
      'continuous verification, not a one-time trust decision that persists for the life of the session.',
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
    pitfall:
      "Trusting a device because it's corporate-owned, without also checking its current compliance state — " +
      'an enrolled laptop that has fallen out of patch compliance is still a device, not automatically a trustworthy one.',
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
    pitfall:
      'Enforcing policy only at login, not per-request — a session can keep riding on stale trust after a ' +
      'device falls out of compliance mid-session.',
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
    pitfall:
      'Applying microsegmentation at the network layer only, while leaving broad IAM roles in place that let a ' +
      'compromised workload reach far more than it operationally needs.',
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
    pitfall:
      'Encrypting data at rest but leaving broad, static access grants in place — encryption protects data ' +
      'from unauthorized viewing, not from an already-authorized-but-compromised identity misusing it.',
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

/* ============================================================
   ATTACK PATH SIMULATION
   A fixed, illustrative blast-radius comparison — not provider/model
   driven like the request flow above. One compromised laptop, two
   architectures: a flat perimeter network where lateral movement is
   unconstrained, versus a Zero Trust network where every hop past the
   first is re-verified and denied by default.
   ============================================================ */

export const ATTACK_PATH_DOWNSTREAM = ['Workload B', 'Workload C', 'Database'];

/* ============================================================
   MATURITY ASSESSMENT
   Grounded in the DoD Zero Trust Strategy (2022) — 7 pillars, each
   progressing through Not Started -> Target Level (91 of 152 DoD
   Zero Trust activities, due FY2027) -> Advanced Level (the
   remaining 61 activities, due 2032). This is a simplified self-
   assessment for portfolio/teaching purposes, not an official DoD
   assessment tool — see DOD_ZT_STRATEGY_URL for the authoritative
   source. Recommendation text below is original, written to describe
   a plausible next step from each stage, not transcribed from the
   strategy document itself.
   ============================================================ */

export type ZtPillarId =
  | 'user'
  | 'device'
  | 'network'
  | 'apps'
  | 'data'
  | 'automation'
  | 'visibility';

export type MaturityStage = 'not-started' | 'target' | 'advanced';

export interface MaturityPillar {
  id: ZtPillarId;
  order: number;
  name: string;
  recommendations: Record<MaturityStage, string>;
}

export const MATURITY_STAGE_LABELS: Record<MaturityStage, string> = {
  'not-started': 'Not Started',
  target: 'Target Level',
  advanced: 'Advanced Level',
};

export const DOD_ZT_STRATEGY_URL = 'https://dodcio.defense.gov/Zero-Trust/';

export const MATURITY_PILLARS: MaturityPillar[] = [
  {
    id: 'user',
    order: 1,
    name: 'User',
    recommendations: {
      'not-started':
        'Start centralizing identity behind a single IdP and enforcing MFA everywhere before adding finer-grained policy.',
      target:
        'Move from static role-based access to continuous, risk-based authentication that re-evaluates trust throughout the session.',
      advanced:
        'Maintain continuous identity verification and keep phishing-resistant MFA enforced as your baseline, not an exception.',
    },
  },
  {
    id: 'device',
    order: 2,
    name: 'Device',
    recommendations: {
      'not-started':
        'Deploy endpoint management and posture-checking on every device before granting access to anything sensitive.',
      target:
        'Move from periodic compliance checks to continuous, real-time device posture signals feeding access decisions.',
      advanced:
        "Keep device trust signals current as your fleet and threat landscape evolve — this pillar decays quietly if left alone.",
    },
  },
  {
    id: 'network',
    order: 3,
    name: 'Network and Environment',
    recommendations: {
      'not-started':
        'Begin segmenting flat networks — even coarse VLAN separation is a meaningful first step away from implicit trust.',
      target:
        'Replace network-location-based trust with identity-aware microsegmentation between individual workloads.',
      advanced:
        "Continue tightening segmentation boundaries as new workloads are added — don't let network sprawl erode this pillar.",
    },
  },
  {
    id: 'apps',
    order: 4,
    name: 'Applications and Workloads',
    recommendations: {
      'not-started':
        'Start enforcing per-request authorization on your highest-value applications before expanding further.',
      target:
        'Extend per-request, least-privilege authorization to the rest of your application portfolio.',
      advanced:
        'Keep authorization scoped tightly as applications change — stale broad grants are the most common regression here.',
    },
  },
  {
    id: 'data',
    order: 5,
    name: 'Data',
    recommendations: {
      'not-started':
        'Begin classifying data by sensitivity and enforcing encryption for anything above a baseline classification.',
      target:
        'Tie access policy directly to data classification and location, not just to the system storing it.',
      advanced:
        'Keep classification and access policy in sync as data moves and multiplies across systems.',
    },
  },
  {
    id: 'automation',
    order: 6,
    name: 'Automation and Orchestration',
    recommendations: {
      'not-started':
        "Establish automated policy enforcement and incident response playbooks — DoD's most commonly cited implementation gap.",
      target:
        'Expand automated response to cover more of the pillars above, reducing how much of Zero Trust depends on manual steps.',
      advanced:
        "Continue automating new controls as they're added elsewhere, so this pillar doesn't fall behind the rest.",
    },
  },
  {
    id: 'visibility',
    order: 7,
    name: 'Visibility and Analytics',
    recommendations: {
      'not-started':
        'Start centralizing logs and telemetry from identity, device, and network sources into one place you can actually query.',
      target:
        'Layer analytics and anomaly detection on top of that telemetry so policy decisions can react to it automatically.',
      advanced:
        "Keep expanding analytics coverage as new systems and pillars mature — visibility gaps hide everywhere else's blind spots.",
    },
  },
];
