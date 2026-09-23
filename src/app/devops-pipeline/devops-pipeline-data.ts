/* ============================================================
   DEVOPS-PIPELINE-DATA.TS — SECURE CI/CD PIPELINE BUILDER
   Grounded in NIST SP 800-218, the Secure Software Development
   Framework (SSDF). Each gate maps to a specific SSDF practice
   (PO = Prepare the Organization, PS = Protect the Software,
   PW = Produce Well-Secured Software, RV = Respond to
   Vulnerabilities). Practice descriptions are paraphrased and
   the pipeline itself is an original, illustrative composition —
   this is not an official NIST assessment tool or an exhaustive
   DevSecOps toolchain. Say so plainly in the UI disclaimer.
   ============================================================ */

export type StageId = 'source' | 'build' | 'test' | 'deploy' | 'operate';

export interface GateConfig {
  id: string;
  name: string;
  settingLabel: string;
  secureValue: string;
  insecureValue: string;
  explanation: string;
  ssdfPractice: string;
  ssdfPracticeName: string;
}

export interface StageConfig {
  id: StageId;
  name: string;
  tagline: string;
  gates: GateConfig[];
}

export const SSDF_URL = 'https://csrc.nist.gov/pubs/sp/800/218/final';
export const SSDF_NAME = 'NIST SP 800-218 (Secure Software Development Framework)';

export const PIPELINE_STAGES: StageConfig[] = [
  {
    id: 'source',
    name: 'Source',
    tagline: 'Where code enters the pipeline',
    gates: [
      {
        id: 'branch-protection',
        name: 'Pull Request Merge Gate',
        settingLabel: 'Required approvals before merge',
        secureValue: 'Enforced (min. 1 reviewer, no self-approval)',
        insecureValue: 'Not enforced — direct pushes allowed',
        explanation:
          'Code that ships without a second set of eyes skips one of the cheapest, earliest chances to catch a vulnerability — before it is ever built or deployed.',
        ssdfPractice: 'PW.7',
        ssdfPracticeName: 'Review Human-Readable Code',
      },
      {
        id: 'secrets-scanning',
        name: 'Secrets Scanning',
        settingLabel: 'Pre-commit / pre-merge secret detection',
        secureValue: 'Enabled — blocks the push',
        insecureValue: 'Not configured',
        explanation:
          'A committed API key or credential is compromised the moment it is pushed, even if the commit is later reverted — it already exists in git history.',
        ssdfPractice: 'PS.1',
        ssdfPracticeName: 'Protect All Forms of Code From Unauthorized Access and Tampering',
      },
    ],
  },
  {
    id: 'build',
    name: 'Build',
    tagline: 'Where source becomes an artifact',
    gates: [
      {
        id: 'sca',
        name: 'Software Composition Analysis (SCA)',
        settingLabel: 'Dependency vulnerability scanning',
        secureValue: 'Enabled — fails the build on known-vulnerable packages',
        insecureValue: 'Not configured',
        explanation:
          'Most applications are majority third-party code. An unscanned dependency tree is an unscanned attack surface.',
        ssdfPractice: 'PW.4',
        ssdfPracticeName: 'Reuse Existing, Well-Secured Software',
      },
      {
        id: 'sbom',
        name: 'Software Bill of Materials (SBOM)',
        settingLabel: 'SBOM generation per build',
        secureValue: 'Generated and attached to the release',
        insecureValue: 'Not generated',
        explanation:
          'Without an SBOM, answering "are we affected by this new CVE" after the fact means manually auditing every build instead of querying a manifest.',
        ssdfPractice: 'PS.3',
        ssdfPracticeName: 'Archive and Protect Each Software Release',
      },
      {
        id: 'hardened-build',
        name: 'Hardened, Ephemeral Build Environment',
        settingLabel: 'Build runner provenance',
        secureValue: 'Ephemeral, isolated per-build runner',
        insecureValue: 'Long-lived, shared build server',
        explanation:
          'A shared, long-lived build server is a single compromise away from silently poisoning every artifact it produces afterward.',
        ssdfPractice: 'PW.6',
        ssdfPracticeName: 'Configure the Compilation and Build Process to Improve Executable Security',
      },
    ],
  },
  {
    id: 'test',
    name: 'Test',
    tagline: 'Where the artifact gets attacked before an adversary does',
    gates: [
      {
        id: 'sast',
        name: 'Static Application Security Testing (SAST)',
        settingLabel: 'Automated source-code analysis',
        secureValue: 'Enabled — fails the build on high/critical findings',
        insecureValue: 'Not configured',
        explanation:
          'SAST catches classes of bugs — injection, unsafe deserialization, hardcoded crypto — that code review alone tends to miss at scale.',
        ssdfPractice: 'PW.7',
        ssdfPracticeName: 'Review Human-Readable Code',
      },
      {
        id: 'dast',
        name: 'Dynamic Application Security Testing (DAST)',
        settingLabel: 'Automated testing against a running staging instance',
        secureValue: 'Enabled before promotion to production',
        insecureValue: 'Not configured',
        explanation:
          "DAST exercises the application the way an attacker would — from the outside, against the running system — catching runtime and configuration issues static analysis can't see.",
        ssdfPractice: 'PW.8',
        ssdfPracticeName: 'Test Executable Code',
      },
      {
        id: 'iac-scan',
        name: 'Infrastructure-as-Code (IaC) Scanning',
        settingLabel: 'Terraform / CloudFormation / Kubernetes manifest scanning',
        secureValue: 'Enabled — fails on insecure defaults',
        insecureValue: 'Not configured',
        explanation:
          'A misconfigured security group or public storage bucket defined in code is a misconfiguration you can catch before it ever provisions anything.',
        ssdfPractice: 'PW.9',
        ssdfPracticeName: 'Configure Software to Have Secure Settings by Default',
      },
    ],
  },
  {
    id: 'deploy',
    name: 'Deploy',
    tagline: 'Where the artifact reaches a real environment',
    gates: [
      {
        id: 'artifact-signing',
        name: 'Artifact Signing & Verification',
        settingLabel: 'Signed build artifacts, verified before deploy',
        secureValue: 'Enforced (e.g. Sigstore / cosign)',
        insecureValue: 'Not enforced',
        explanation:
          'Without signature verification, nothing actually confirms that what gets deployed is the artifact the pipeline built — rather than something tampered with in between.',
        ssdfPractice: 'PS.2',
        ssdfPracticeName: 'Provide a Mechanism for Verifying Software Release Integrity',
      },
      {
        id: 'image-scanning',
        name: 'Container Image Scanning',
        settingLabel: 'Base-image and layer vulnerability scanning',
        secureValue: 'Enabled — blocks deploy on critical CVEs',
        insecureValue: 'Not configured',
        explanation:
          'A base image is third-party software like any dependency — an unscanned one can ship known-exploitable vulnerabilities straight into production.',
        ssdfPractice: 'PW.4',
        ssdfPracticeName: 'Reuse Existing, Well-Secured Software',
      },
      {
        id: 'deploy-creds',
        name: 'Deployment Credentials',
        settingLabel: 'Deploy-time authentication to the target environment',
        secureValue: 'Short-lived, scoped OIDC / workload identity',
        insecureValue: 'Long-lived static cloud keys',
        explanation:
          'A long-lived static credential sitting in CI configuration is a permanent, high-value target; short-lived scoped credentials limit what a leak can actually do.',
        ssdfPractice: 'PO.5',
        ssdfPracticeName: 'Implement and Maintain Secure Environments for Software Development',
      },
    ],
  },
  {
    id: 'operate',
    name: 'Operate',
    tagline: "Where yesterday's clean build meets today's new CVE",
    gates: [
      {
        id: 'runtime-monitoring',
        name: 'Continuous Vulnerability Monitoring',
        settingLabel: 'Production dependency & image monitoring',
        secureValue: 'Enabled — alerts on newly disclosed CVEs',
        insecureValue: 'Not monitored after deploy',
        explanation:
          'A dependency that was clean at build time can become vulnerable the day after you ship it, when a new CVE is disclosed against it.',
        ssdfPractice: 'RV.1',
        ssdfPracticeName: 'Identify and Confirm Vulnerabilities on an Ongoing Basis',
      },
      {
        id: 'incident-playbook',
        name: 'Vulnerability Response Process',
        settingLabel: 'Documented, tested remediation / rollback path',
        secureValue: 'Defined SLA and a tested rollback procedure',
        insecureValue: 'Ad hoc, no defined process',
        explanation:
          'Finding a vulnerability in production is only half the problem — without a rehearsed remediation and rollback path, response time is left to improvisation under pressure.',
        ssdfPractice: 'RV.2',
        ssdfPracticeName: 'Assess, Prioritize, and Remediate Vulnerabilities',
      },
    ],
  },
];
