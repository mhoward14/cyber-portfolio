import { Component, signal, computed, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, AfterViewInit {
  searchTerm = signal('');
  isFiltering = signal(false);
  aboutExpanded = signal(false);
  isDarkMode = signal(true);
  expandedProject = signal<string | null>(null);

  ngOnInit() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      this.isDarkMode.set(false);
      document.body.classList.add('light-mode');
    } else if (!saved && !window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.isDarkMode.set(false);
      document.body.classList.add('light-mode');
    }
  }

  ngAfterViewInit() {
    if (!document.querySelector('link[data-expandable-case-studies]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'expandable-case-studies.css';
      stylesheet.setAttribute('data-expandable-case-studies', 'true');
      document.head.appendChild(stylesheet);
    }

    if (!document.querySelector('script[data-credly-embed]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.credly.com/assets/utilities/embed.js';
      script.async = true;
      script.setAttribute('data-credly-embed', 'true');
      document.body.appendChild(script);
    }
  }

  toggleTheme() {
    const goingLight = this.isDarkMode();
    this.isDarkMode.set(!goingLight);
    document.body.classList.toggle('light-mode', goingLight);
    localStorage.setItem('theme', goingLight ? 'light' : 'dark');
  }

  toggleAbout() {
    this.aboutExpanded.set(!this.aboutExpanded());
  }

  toggleProject(title: string) {
    this.expandedProject.set(this.expandedProject() === title ? null : title);
  }

  isExpanded(title: string) {
    return this.expandedProject() === title;
  }

  projects = signal([
    {
      title: 'Cybersecurity Graduate Capstone',
      role: 'Graduate Capstone | Federal Cybersecurity Architecture & Governance',
      color: '#d97706',
      tags: ['NIST 800-53', 'FISMA', 'Zero Trust', 'Splunk ES', 'Okta', 'CrowdStrike'],
      academicNote: 'Simulated 500-user U.S. federal agency environment. Results and performance measures are design targets, modeled improvements, and implementation criteria rather than claims from a production federal deployment.',
      context: 'Designed an integrated cybersecurity architecture and governance program to address fragmented infrastructure, weak access control, limited monitoring, unresolved audit findings, legacy-system risk, and inconsistent security governance.',
      approach: [
        'Designed a five-zone zero-trust network segmentation model aligned with NIST SP 800-207.',
        'Designed centralized identity lifecycle management using Okta and Active Directory with RBAC, MFA, SSO, least privilege, provisioning/deprovisioning, and quarterly access reviews.',
        'Designed centralized Splunk Enterprise Security monitoring across endpoint, identity, network, server, database, email, Azure, and AWS data sources.',
        'Integrated CrowdStrike Falcon EDR, next-generation firewalls, encryption, backup, high availability, and incident-response workflows.',
        'Developed security policies, risk reviews, risk-register practices, POA&M-based remediation, acceptance criteria, KPIs, and a phased eight-month implementation roadmap.'
      ],
      frameworks: ['NIST SP 800-53 Rev. 5', 'NIST CSF', 'NIST SP 800-207', 'FISMA', 'Splunk Enterprise Security', 'Okta', 'Active Directory', 'CrowdStrike Falcon', 'Azure', 'AWS', 'RBAC / MFA / SSO', 'Zero Trust'],
      deliverables: ['Security governance policy set', 'Zero-trust network architecture', 'IAM architecture and access-review model', 'SIEM / SOC monitoring strategy', 'Incident-response and forensic workflow', 'Risk register and POA&M remediation model', 'Implementation roadmap and budget', 'KPIs, acceptance criteria, and evaluation plan'],
      demonstrates: 'Ability to integrate governance, risk, architecture, IAM, security operations, incident response, and federal compliance requirements into a cohesive cybersecurity program, then communicate the design through policies, architecture decisions, implementation planning, and measurable acceptance criteria.'
    },
    {
      title: 'Governance, Risk, & Compliance',
      role: "ISSO | Dean's Excellence Award",
      color: '#3b82f6',
      tags: ['GRC', 'NIST 800-53', 'FISMA', 'PCI DSS', 'POA&M', 'Risk Assessment'],
      academicNote: 'Graduate performance assessment for a simulated healthcare technology organization. Findings and remediation recommendations were produced as part of the academic scenario.',
      context: 'Conducted a comprehensive security-system evaluation and gap analysis for Fielder Medical Center, identifying critical deficiencies in access control, continuous monitoring, and security documentation.',
      approach: [
        'Mapped five critical security controls to NIST SP 800-53 Rev. 5, FISMA, and PCI DSS requirements.',
        'Performed a NIST Cybersecurity Framework-based risk assessment and prioritized 28 identified risks.',
        'Developed a POA&M addressing access-control, MFA, endpoint-protection, and continuous-monitoring gaps.',
        'Designed an enterprise continuous-monitoring strategy aligned with NIST SP 800-137.',
        'Translated assessment findings into specific remediation actions and defensible compliance documentation.'
      ],
      frameworks: ['NIST SP 800-53 Rev. 5', 'NIST CSF', 'NIST SP 800-137', 'FISMA', 'PCI DSS', 'POA&M', 'Risk Assessment', 'Continuous Monitoring'],
      deliverables: ['Security control mapping', '28-item prioritized risk assessment', 'Plan of Action & Milestones', 'Continuous monitoring strategy', 'Compliance remediation plan', 'Security documentation gap analysis'],
      demonstrates: 'Ability to perform ISSO/GRC-style analysis by connecting technical findings to controls, risk, remediation priorities, POA&M actions, continuous monitoring, and audit-ready documentation.'
    },
    {
      title: 'Penetration Testing',
      role: "Security Analyst | Dean's Excellence Award",
      color: '#ef4444',
      tags: ['CompTIA PenTest+', 'Penetration Testing', 'HIPAA', 'PCI DSS', 'Social Engineering', 'Reconnaissance'],
      academicNote: 'Graduate penetration-testing engagement plan for a simulated healthcare organization. The project focused on planning, methodology, scope, risk controls, and reporting rather than an unsupervised attack on a live organization.',
      context: 'Designed a comprehensive penetration-testing engagement for Pruhart Tech, a healthcare environment protecting ePHI and payment data, with a focus on evaluating controls while preserving operational continuity.',
      approach: [
        'Developed a methodology covering reconnaissance, vulnerability assessment, exploitation, and post-exploitation phases.',
        'Defined internal and external scope across network exposures, Active Directory, endpoint controls, and sensitive-data repositories.',
        'Designed social-engineering scenarios covering phishing, pretexting, and user susceptibility.',
        'Established rules of engagement, escalation procedures, testing boundaries, and incident-response safeguards.',
        'Aligned the engagement approach with HIPAA and PCI DSS obligations.'
      ],
      frameworks: ['CompTIA PenTest+', 'Reconnaissance', 'Vulnerability Assessment', 'Active Directory', 'Social Engineering', 'HIPAA', 'PCI DSS', 'Rules of Engagement'],
      deliverables: ['Penetration-test engagement plan', 'Scope and assumptions', 'Rules of engagement', 'Social-engineering test scenarios', 'Escalation and safety procedures', 'Compliance considerations', 'Reporting methodology'],
      demonstrates: 'Ability to structure a professional penetration-testing engagement, define scope and risk controls, integrate compliance considerations, and communicate a defensible testing methodology before active assessment begins.'
    },
    {
      title: 'Cybersecurity Architecture & Engineering',
      role: 'Architecture & Engineering Specialist',
      color: '#10b981',
      tags: ['CompTIA SecurityX', 'Enterprise Architecture', 'Cloud Security', 'Threat Modeling', 'DLP'],
      academicNote: 'Graduate architecture and engineering work aligned with advanced enterprise-security concepts and the CompTIA SecurityX framework.',
      context: 'Evaluated enterprise security architectures across distributed, cloud, virtualized, application, and data environments with emphasis on resilient design and secure integration.',
      approach: [
        'Evaluated enterprise architectures integrating security controls across distributed environments.',
        'Analyzed IaaS, PaaS, SaaS, and virtualization security considerations.',
        'Applied encryption, data loss prevention, rights management, and secure data-lifecycle controls.',
        'Assessed API security, secure coding considerations, and software-integration risk.',
        'Conducted threat modeling and vulnerability analysis to identify architecture weaknesses.',
        'Developed incident-response and business-continuity strategies aligned with organizational risk tolerance.'
      ],
      frameworks: ['CompTIA SecurityX', 'Enterprise Architecture', 'IaaS / PaaS / SaaS', 'Threat Modeling', 'DLP', 'Encryption', 'API Security', 'Business Continuity'],
      deliverables: ['Architecture evaluations', 'Cloud-security design analysis', 'Data-protection control strategy', 'Threat models', 'Application-integration risk analysis', 'Incident-response and resilience recommendations'],
      demonstrates: 'Ability to evaluate security as a system-of-systems problem and balance architecture, cloud, applications, data protection, resilience, and risk rather than treating controls in isolation.'
    },
    {
      title: 'Cloud Security',
      role: 'Azure Cloud Security Engineer',
      color: '#06b6d4',
      tags: ['Azure', 'PaaS', 'RBAC', 'Key Vault', 'NIST 800-53', 'FISMA'],
      academicNote: 'Graduate cloud-security implementation project using a simulated hybrid Azure environment.',
      context: 'Designed a secure hybrid Microsoft Azure Platform-as-a-Service environment integrated with legacy on-premises applications while maintaining federal and industry security requirements.',
      approach: [
        'Designed a hybrid Azure PaaS architecture with defined security boundaries between cloud and legacy systems.',
        'Applied Azure RBAC and least privilege across resources and services.',
        'Integrated Azure Key Vault for centralized key management and encryption.',
        'Aligned the architecture with FISMA, NIST SP 800-53, and PCI DSS requirements.',
        'Designed monitoring and logging using Azure-native security capabilities.'
      ],
      frameworks: ['Microsoft Azure', 'Azure PaaS', 'Azure RBAC', 'Azure Key Vault', 'Azure Security Center', 'NIST SP 800-53', 'FISMA', 'PCI DSS', 'Encryption'],
      deliverables: ['Hybrid cloud architecture', 'RBAC access model', 'Key-management design', 'Encryption strategy', 'Compliance mapping', 'Monitoring and logging plan'],
      demonstrates: 'Ability to apply identity, encryption, monitoring, and compliance controls to a hybrid cloud architecture while accounting for integration with legacy systems.'
    },
    {
      title: 'Security Operations',
      role: 'SOC Analyst',
      color: '#f97316',
      tags: ['CompTIA CySA+', 'SOC', 'Incident Response', 'Digital Forensics', 'NIST IR', 'Threat Intelligence'],
      academicNote: 'Graduate incident-response investigation using simulated enterprise evidence and attack activity.',
      context: 'Investigated a simulated enterprise incident involving malicious network traffic and unauthorized access, then developed a response and remediation strategy.',
      approach: [
        'Performed log analysis, network-forensic review, and packet-capture analysis to determine attack vectors and root cause.',
        'Classified incident severity and impact and identified affected systems, compromised data, and lateral-movement indicators.',
        'Aligned investigation and reporting with the NIST incident-response lifecycle.',
        'Developed containment, remediation, patching, and control-improvement recommendations.',
        'Identified indicators of compromise, malicious IP addresses, and attack patterns for future detection.'
      ],
      frameworks: ['CompTIA CySA+', 'SOC Operations', 'NIST Incident Response', 'Log Analysis', 'Packet Analysis', 'Digital Forensics', 'IOCs', 'Threat Intelligence'],
      deliverables: ['Incident investigation report', 'Attack-vector analysis', 'Incident classification', 'IOC list', 'Containment plan', 'Remediation recommendations', 'Lessons learned'],
      demonstrates: 'Ability to move from raw security evidence to incident classification, attack reconstruction, containment, remediation, and lessons learned in a structured SOC/IR workflow.'
    },
    {
      title: 'Secure Network Design',
      role: 'Secure Network Design Engineer',
      color: '#8b5cf6',
      tags: ['Network Security', 'Zero Trust', 'HIPAA', 'PCI DSS', 'CVSS', 'VLAN'],
      academicNote: 'Graduate secure-network design project for a simulated post-acquisition merger environment.',
      context: 'Designed a secure merged network architecture after an acquisition, integrating cloud and on-premises infrastructure while meeting healthcare and payment-card security requirements within defined budget constraints.',
      approach: [
        'Designed a merged network architecture integrating cloud services with on-premises infrastructure.',
        'Identified and documented more than 20 vulnerabilities using CVSS and NIST SP 800-30 Rev. 1 methods.',
        'Applied zero trust, least privilege, and defense-in-depth principles.',
        'Designed segmentation using firewalls, VLANs, and access-control lists.',
        'Addressed HIPAA and PCI DSS requirements while working within the project budget.'
      ],
      frameworks: ['NIST SP 800-30 Rev. 1', 'CVSS', 'Zero Trust', 'Defense in Depth', 'VLANs', 'Firewalls', 'ACLs', 'HIPAA', 'PCI DSS'],
      deliverables: ['Merged network architecture', 'Vulnerability register', 'CVSS scoring', 'Risk analysis', 'Segmentation design', 'Firewall / VLAN / ACL strategy', 'Compliance design'],
      demonstrates: 'Ability to combine architecture, vulnerability assessment, segmentation, regulatory requirements, and project constraints into a practical network-security design.'
    },
    {
      title: 'Cybersecurity Management',
      role: 'Chief Information Security Officer (CISO)',
      color: '#f59e0b',
      tags: ['ISACA CISM', 'CISO', 'GDPR', 'PCI DSS', 'NICE Framework', 'BCP/BIA', 'IRP'],
      academicNote: 'Graduate cybersecurity-management assessment for a simulated retail organization.',
      context: 'Led the strategic response to an independent security assessment for SAGE Books and developed a cybersecurity roadmap addressing e-commerce security, governance, compliance, workforce, incident response, and resilience.',
      approach: [
        'Developed enterprise mitigation strategies aligned with PCI DSS and GDPR.',
        'Defined three critical security leadership roles using the NICE Framework.',
        'Conducted physical and logical vulnerability analysis.',
        'Designed a NIST-aligned cybersecurity awareness and role-based training program.',
        'Formalized standards for acceptable use, mobile devices, passwords, and PII protection.',
        'Authored an incident-response plan and a business-continuity plan with BIA and implementation strategy.'
      ],
      frameworks: ['CISM Domains', 'NICE Framework', 'PCI DSS', 'GDPR', 'NIST Incident Response', 'BCP', 'BIA', 'Security Awareness', 'Policy Governance'],
      deliverables: ['Cybersecurity roadmap', 'Leadership-role definitions', 'Vulnerability assessment', 'Security awareness program', 'Security policy standards', 'Incident Response Plan', 'Business Continuity Plan'],
      demonstrates: 'Ability to operate at the management layer by translating security findings into governance, workforce, policy, training, incident-response, and continuity programs.'
    },
    {
      title: 'Secure Software Design',
      role: 'Academic Focus',
      color: '#6366f1',
      tags: ['DevSecOps', 'SDLC', 'Agile', 'Defense in Depth'],
      academicNote: 'Graduate coursework focused on secure software design and integration of security activities throughout the development lifecycle.',
      context: 'Applied security principles to software-development lifecycle decisions, with emphasis on integrating rather than bolting on security controls.',
      approach: [
        'Applied defense-in-depth principles across the software development lifecycle.',
        'Adapted security activities to Agile development practices.',
        'Integrated DevSecOps concepts into development and deployment workflows.',
        'Considered secure design, testing, change management, and operational feedback as connected lifecycle activities.'
      ],
      frameworks: ['DevSecOps', 'Secure SDLC', 'Agile', 'Defense in Depth', 'Secure Design', 'Security Testing', 'Change Management'],
      deliverables: ['Secure SDLC approach', 'DevSecOps integration model', 'Agile security practices', 'Defense-in-depth design considerations'],
      demonstrates: 'Understanding of how cybersecurity fits into software delivery, including secure design, iterative development, testing, deployment, and operational feedback.'
    },
    {
      title: 'Security Foundations',
      role: '(ISC)² Certified in Cybersecurity (CC)',
      color: '#0ea5e9',
      tags: ['(ISC)² CC', 'Security Principles', 'Risk Management', 'Access Control', 'Network Security', 'Security Operations'],
      academicNote: 'Credential-based competency area rather than a standalone graduate project. Included to show the foundational security domains supporting the advanced portfolio work.',
      context: 'Demonstrated foundational cybersecurity knowledge across governance, risk, access control, continuity, network security, and security operations through the (ISC)² Certified in Cybersecurity credential.',
      approach: [
        'Applied CIA triad, governance, risk-management, and security-control concepts.',
        'Covered business continuity, disaster recovery, and the incident-response lifecycle.',
        'Evaluated logical and physical access-control models including RBAC, least privilege, and separation of duties.',
        'Applied network-security concepts including firewalls, IDS/IPS, VLANs, DMZs, VPNs, microsegmentation, and zero trust.',
        'Applied data protection, system hardening, patch management, and security-awareness concepts.'
      ],
      frameworks: ['(ISC)² CC', 'CIA Triad', 'Risk Management', 'RBAC', 'BCP / DR', 'Incident Response', 'Network Security', 'Zero Trust', 'Security Operations'],
      deliverables: ['Foundational security competency', 'Risk-management knowledge', 'Access-control knowledge', 'Network-security knowledge', 'Security-operations knowledge'],
      demonstrates: 'A broad security foundation that supports the more specialized GRC, architecture, penetration-testing, cloud, and operations work shown elsewhere in the portfolio.'
    }
  ]);

  filteredProjects = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.projects();
    return this.projects().filter((p: any) =>
      [p.title, p.role, p.context, ...(p.tags || []), ...(p.frameworks || [])]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  });

  totalProjects = computed(() => this.projects().length);
  isSearchActive = computed(() => this.searchTerm().trim().length > 0);

  onSearch(value: string) {
    this.isFiltering.set(true);
    this.searchTerm.set(value);
    this.expandedProject.set(null);
    setTimeout(() => this.isFiltering.set(false), 300);
  }
}
