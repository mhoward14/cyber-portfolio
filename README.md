# Matthew Howard Cybersecurity Portfolio

An interactive cybersecurity project site presenting graduate case studies, security-framework tools, and supporting technical work across governance, risk, compliance, security architecture, cloud security, secure network design, penetration-testing methodology, and security operations.

**Live site:** [mhoward14.github.io/cyber-portfolio](https://mhoward14.github.io/cyber-portfolio/)

## What the portfolio includes

### Expanded cybersecurity case studies

The portfolio contains ten searchable, expandable project areas. Each case study describes its context, approach, frameworks and technologies, key deliverables, and the capabilities it demonstrates. Topics include:

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

Every project includes a visible qualification note identifying it as academic, simulated, or credential-based work as applicable. The site distinguishes those artifacts from professional experience and does not present modeled outcomes, design targets, or lab results as evidence from a production deployment.

### Security Framework Crosswalk

An interactive demonstration tool that maps approximately 20 commonly used control topics across:

- NIST SP 800-53 Rev. 5
- CIS Controls v8
- ISO/IEC 27001:2022 Annex A

Users can search and filter topics, choose an anchor framework, review strong or partial relationships, and follow links to official source material. The crosswalk is intentionally labeled as a curated demonstration rather than an exhaustive or authoritative mapping.

### NIST 800-53 / RMF Control Tracker

A browser-based RMF workflow demonstration built around Low, Moderate, and High FIPS 199 impact levels. It supports:

- A curated subset of roughly 140 base controls across all 20 NIST SP 800-53 Rev. 5 control families
- Implementation-status tracking and control notes
- Search and filters by control family or status
- Completion summaries
- Draft POA&M text generation
- Local browser storage for entered data

The tracker clearly states that it is a demonstration and directs users to NIST SP 800-53B for authoritative baselines and tailoring.

## Site features

- Responsive Angular single-page application
- Searchable and expandable project case studies
- Dark and light themes with saved browser preference
- Client-side routing for the portfolio, crosswalk, and RMF tracker
- Static output suitable for GitHub Pages
- Automated framework-publication checks that flag possible source updates for human review

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

## Deployment

Pushes to the `master` branch trigger the GitHub Pages workflow. The workflow:

1. Checks out the repository using commit-pinned actions.
2. Installs dependencies with `npm ci`.
3. Builds the production site.
4. Uploads the static browser output as a Pages artifact.
5. Deploys the artifact using narrowly scoped job permissions and GitHub's OIDC-based Pages deployment.

A separate scheduled workflow checks official publication pages for possible NIST SP 800-53, CIS Controls, or ISO/IEC 27001 revisions. It can open an issue for review but does not automatically alter the crosswalk data.

## Scope and attribution

This repository combines a custom portfolio application with cybersecurity artifacts created through graduate study, simulated scenarios, credential preparation, and independent portfolio development. Scenario organizations are fictional unless explicitly stated otherwise. References to technologies and frameworks describe the tools, standards, designs, or analyses used in those settings; they do not imply that the academic scenarios were live operational environments or production implementations.
