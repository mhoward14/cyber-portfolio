# Matthew Howard Cybersecurity Portfolio

An interactive cybersecurity portfolio spanning **GRC/RMF, cloud and Zero Trust architecture, security operations, vulnerability analysis, and penetration-testing methodology**. It combines six browser-based security tools with ten graduate case-study areas and supporting application-security work.

**Live site:** [mhoward14.github.io/cyber-portfolio](https://mhoward14.github.io/cyber-portfolio/)

> **Scope note:** The tools and case studies demonstrate applied analysis, design, and decision-making in academic and simulated environments. They are not presented as production deployments or operational outcomes. Professional Air Force/DoD experience is identified separately from portfolio work.

## Start here

For a short recruiter or hiring-manager review:

1. **[Attack Path Builder](https://mhoward14.github.io/cyber-portfolio/#/attack-path)** — see how offensive techniques connect to defensive controls across the portfolio.
2. **[Cloud Security Configuration Builder](https://mhoward14.github.io/cyber-portfolio/#/cloud-security)** — change Azure, AWS, or GCP settings and watch the security posture respond.
3. **[Incident Response Playbook Simulator](https://mhoward14.github.io/cyber-portfolio/#/incident-response)** — work through a security incident and receive decision-by-decision feedback.
4. Use the remaining tools to go deeper into **Zero Trust architecture, RMF control management, and framework mapping**.

## Interactive security tools

| Tool | What it does | What it demonstrates |
| --- | --- | --- |
| **[Attack Path Builder](https://mhoward14.github.io/cyber-portfolio/#/attack-path)** | Chains MITRE ATT&CK techniques across six attack stages and updates a live detection-likelihood assessment. Each selected technique links to a mapped defensive capability in the Zero Trust, incident-response, cloud-security, or RMF tools. | Threat modeling, ATT&CK technique chaining, detection reasoning, control mapping, and offense-to-defense analysis relevant to SOC, vulnerability-management, penetration-testing, cloud-security, and ISSO interviews. |
| **[Cloud Security Configuration Builder](https://mhoward14.github.io/cyber-portfolio/#/cloud-security)** | Lets users configure security settings for representative Azure, AWS, and GCP resources, including public access, encryption, network exposure, MFA, and secret rotation. A live posture score reacts to each decision. | Cloud shared-responsibility reasoning, secure configuration, identity and access management, encryption, network exposure, and practical application of the CIS cloud-provider foundations benchmarks. |
| **[Zero Trust Cloud Architecture Explorer](https://mhoward14.github.io/cyber-portfolio/#/zero-trust)** | Explores an identity-to-data request flow, compares traditional-perimeter and Zero Trust attack paths, and provides a seven-pillar maturity assessment based on the DoD Zero Trust Strategy. Cloud-provider and deployment-model selections update responsibilities and services throughout the flow. | NIST SP 800-207 concepts, DoD Zero Trust pillars, policy enforcement, identity/device/workload/data controls, cloud responsibility boundaries, architecture tradeoffs, and maturity assessment. |
| **[Incident Response Playbook Simulator](https://mhoward14.github.io/cyber-portfolio/#/incident-response)** | Presents original ransomware, phishing-compromise, insider-threat, and DDoS scenarios grounded in the NIST incident-handling lifecycle. Users make decisions, receive immediate feedback, review a phase-by-phase debrief, and export results to CSV. | Incident triage, containment and recovery decisions, post-incident analysis, documentation, and communication of response rationale. Scenario content and grading are original simulations, not an official NIST answer key. |
| **[NIST 800-53 / RMF Control Tracker](https://mhoward14.github.io/cyber-portfolio/#/rmf-tracker)** | Tracks implementation status and notes for a curated subset of roughly 140 base controls across all 20 NIST SP 800-53 Rev. 5 control families. Includes impact-level selection, search and filtering, completion summaries, draft POA&M text, and local browser storage. | RMF workflow, control assessment, implementation tracking, documentation, remediation planning, and risk communication. The tool directs users to NIST SP 800-53B for authoritative baselines and tailoring. |
| **[Security Framework Crosswalk](https://mhoward14.github.io/cyber-portfolio/#/crosswalk)** | Maps approximately 20 common control topics across NIST SP 800-53 Rev. 5, CIS Controls v8, and ISO/IEC 27001:2022 Annex A, with search, filters, relationship strength, and links to official sources. | Framework interpretation, control relationships, audit/compliance research, and translation between security standards. The mapping is a curated demonstration, not an exhaustive or authoritative crosswalk. |

Together, the tools show a connected workflow: model an attack, identify likely detection and control opportunities, evaluate cloud and Zero Trust design choices, practice incident-response decisions, track RMF implementation, and translate requirements across major frameworks.

## Graduate case studies

The portfolio also contains ten searchable, expandable project areas:

- Cybersecurity graduate capstone
- Governance, risk, and compliance
- Penetration testing
- Cybersecurity architecture and engineering
- Cloud security
- Security operations and incident response
- Secure network design
- Cybersecurity management
- Secure software design
- Security foundations

Each case study describes its context, approach, frameworks and technologies, key deliverables, and demonstrated capabilities. Visible qualification notes identify academic, simulated, or credential-based work as applicable.

## Professional context

The portfolio complements 21 years of U.S. Air Force experience in knowledge operations, information assurance and additional-duty ISSO support, access control, classified-environment security, COMSEC, inspections, security documentation, and remediation coordination. It applies current graduate-level cybersecurity methods without recasting academic labs or simulated scenarios as production administration or operational ownership.

## Application and security features

- Responsive Angular single-page application with a persistent collapsible sidebar
- Searchable and expandable project case studies
- Six routed interactive security tools
- Dark and light themes with saved browser preference
- Local browser storage for longer-running RMF and Zero Trust assessments
- Client-side CSV export for incident-response results
- Automated tests for application logic and tool behavior
- Open Graph and Twitter Card metadata for link previews
- Cookieless Cloudflare Web Analytics
- Static output deployed through GitHub Pages

## Technology

- Angular 21
- TypeScript
- HTML and CSS
- Angular signals and standalone components
- Vitest
- GitHub Actions
- GitHub Pages

## Local development

Requirements:

- Node.js 20
- npm

Install dependencies and start the development server:

```bash
npm ci
npm start
```

Open [http://localhost:4200](http://localhost:4200).

Run the test suite:

```bash
npm test
```

Create a production build:

```bash
npm run build
```

The production configuration uses the `/cyber-portfolio/` base path and generates static browser output in `dist/portfolio-ui/browser/`.

## Deployment and maintenance

Pushes to the `master` branch trigger the GitHub Pages workflow. The workflow:

1. Checks out the repository using commit-pinned actions.
2. Installs dependencies with `npm ci`.
3. Builds the production site.
4. Uploads the static browser output as a Pages artifact.
5. Deploys the artifact using narrowly scoped job permissions and GitHub's OIDC-based Pages deployment.

A separate scheduled workflow checks official publication pages for possible updates to the NIST, CIS, ISO/IEC, DoD Zero Trust, cloud-benchmark, and MITRE ATT&CK references used by the tools. It opens an issue for human review when a possible change is detected; it does not automatically rewrite security content.

## Scope and attribution

This repository combines a custom portfolio application with cybersecurity artifacts created through graduate study, simulated scenarios, credential preparation, and independent portfolio development. Scenario organizations are fictional unless explicitly stated otherwise.

References to products, services, frameworks, and standards identify the sources, technologies, designs, or analyses used in those settings. They do not imply endorsement, certification, live operational deployment, or production ownership. MITRE ATT&CK technique identifiers are grounded in the ATT&CK Enterprise Matrix; the Attack Path Builder's stealth ratings, detection-likelihood model, and cross-tool defensive mappings are original illustrative content.
