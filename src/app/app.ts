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
  selectedProject = signal<any | null>(null);
  isClosing = signal(false);
  isFiltering = signal(false);
  aboutExpanded = signal(false);
  isDarkMode = signal(true);

  ngOnInit() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      if (saved === 'light') {
        this.isDarkMode.set(false);
        document.body.classList.add('light-mode');
      }
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!prefersDark) {
        this.isDarkMode.set(false);
        document.body.classList.add('light-mode');
      }
    }
  }

  ngAfterViewInit() {
    const script = document.createElement('script');
    script.src = 'https://cdn.credly.com/assets/utilities/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }

  toggleTheme() {
    const goingLight = this.isDarkMode();
    this.isDarkMode.set(!goingLight);
    if (goingLight) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  }

  toggleAbout() {
    this.aboutExpanded.set(!this.aboutExpanded());
  }

  projects = signal([
    {
      title: 'Governance, Risk, & Compliance',
      role: 'ISSO | Dean\'s Excellence Award',
      color: '#3b82f6',
      tags: ['GRC', 'NIST 800-53', 'FISMA', 'PCI DSS', 'POA&M', 'Risk Assessment'],
      scope: 'Conducted comprehensive security system evaluation and gap analysis for a simulated healthcare technology organization (Fielder Medical Center), identifying critical deficiencies in access control, continuous monitoring, and security documentation.',
      bullets: [
        'Security Control Mapping: Mapped five (5) critical security controls to NIST SP 800-53 Rev. 5, FISMA, and PCI DSS requirements, ensuring alignment with federal and industry compliance standards.',
        'Risk Assessment & Prioritization: Performed comprehensive risk assessment using the NIST Cybersecurity Framework (CSF); identified and prioritized 28 risks, reducing high-risk exposure by 45% through strategic mitigation planning.',
        'POA&M Development: Developed detailed Plan of Action and Milestones (POA&M) addressing identified gaps in access control policies, multifactor authentication, endpoint protection, and continuous monitoring programs.',
        'Continuous Monitoring Strategy: Proposed enterprise-wide continuous monitoring strategy aligned with NIST SP 800-137, establishing metrics for ongoing security posture assessment.',
        'Compliance Remediation: Addressed critical findings including missing MFA implementation (IA-2), inadequate least privilege enforcement (AC-6), insufficient endpoint protection, and outdated system security plans.'
      ]
    },
    {
      title: 'Penetration Testing',
      role: 'Security Analyst | Dean\'s Excellence Award',
      color: '#ef4444',
      tags: ['Penetration Testing', 'HIPAA', 'PCI DSS', 'Social Engineering', 'Reconnaissance'],
      scope: 'Designed comprehensive penetration testing engagement plan for healthcare organization (Pruhart Tech) protecting electronic Protected Health Information (ePHI) and payment data, with focus on evaluating security controls and identifying exploitation vulnerabilities.',
      bullets: [
        'Engagement Planning: Developed detailed penetration testing methodology covering reconnaissance, vulnerability assessment, exploitation, and post-exploitation phases aligned with industry best practices.',
        'Scope Definition: Defined comprehensive testing scope encompassing internal/external network exposures, Active Directory infrastructure, endpoint security controls, and sensitive data repositories.',
        'Social Engineering Assessment: Designed targeted social engineering test scenarios evaluating organizational susceptibility to phishing, pretexting, and psychological manipulation tactics.',
        'Compliance Integration: Ensured testing approach aligned with HIPAA and PCI DSS regulatory requirements, balancing thorough security assessment with operational continuity and patient safety.',
        'Risk Management Framework: Established clear rules of engagement, escalation procedures, and incident response protocols to minimize risk during active testing operations.'
      ]
    },
    {
      title: 'Cloud Security',
      role: 'Azure Cloud Security Engineer',
      color: '#06b6d4',
      tags: ['Azure', 'PaaS', 'RBAC', 'Key Vault', 'NIST 800-53', 'FISMA'],
      scope: 'Designed and implemented secure hybrid Microsoft Azure Platform-as-a-Service (PaaS) environment integrated with legacy on-premises applications, ensuring compliance with federal and industry security standards.',
      bullets: [
        'Secure Architecture Design: Built secure hybrid Azure PaaS environment integrating cloud services with legacy systems while maintaining security boundaries and data protection.',
        'Identity & Access Management: Implemented comprehensive Role-Based Access Control (RBAC) model enforcing least privilege principles across all Azure resources and services.',
        'Data Protection: Integrated Azure Key Vault for centralized cryptographic key management and data encryption at rest and in transit.',
        'Compliance Validation: Aligned cloud infrastructure with FISMA, NIST 800-53, and PCI DSS standards; passed comprehensive security review with zero findings.',
        'Security Monitoring: Configured Azure Security Center and native logging capabilities for continuous security monitoring and threat detection.'
      ]
    },
    {
      title: 'Security Operations',
      role: 'SOC Analyst',
      color: '#f97316',
      tags: ['SOC', 'Incident Response', 'Digital Forensics', 'NIST IR', 'Threat Intelligence'],
      scope: 'Investigated simulated enterprise-level cybersecurity incident involving malicious network traffic and unauthorized access, performing comprehensive forensic analysis and developing remediation strategy.',
      bullets: [
        'Forensic Investigation: Performed comprehensive log analysis, network forensic review, and packet capture analysis to determine attack vectors and identify root cause of security incident.',
        'Incident Classification: Properly categorized incident severity and impact scope, identifying affected systems, compromised data, and lateral movement indicators.',
        'NIST Framework Alignment: Authored detailed incident response report with corrective actions aligned to NIST Incident Response Lifecycle (Preparation, Detection & Analysis, Containment, Eradication & Recovery, Post-Incident Activity).',
        'Remediation Strategy: Developed comprehensive remediation plan including immediate containment actions, vulnerability patching, security control enhancements, and lessons learned documentation.',
        'Threat Intelligence: Identified indicators of compromise (IOCs), malicious IP addresses, and attack patterns for threat intelligence sharing and future prevention.'
      ]
    },
    {
      title: 'Secure Network Design',
      role: 'Secure Network Design Engineer',
      color: '#8b5cf6',
      tags: ['Network Security', 'Zero Trust', 'HIPAA', 'PCI DSS', 'CVSS', 'VLAN'],
      scope: 'Designed secure merged network architecture post-acquisition, integrating cloud and on-premises systems while ensuring HIPAA and PCI DSS compliance within budgetary constraints.',
      bullets: [
        'Secure Architecture Design: Designed comprehensive merged network architecture integrating cloud services and on-premises infrastructure following post-acquisition requirements.',
        'Vulnerability Assessment: Identified and documented 20+ network vulnerabilities using Common Vulnerability Scoring System (CVSS) and NIST SP 800-30 Rev. 1 risk assessment methodologies.',
        'Security Framework Implementation: Implemented zero trust architecture, least privilege access controls, and defense-in-depth security principles throughout network design.',
        'Regulatory Compliance: Ensured full HIPAA and PCI DSS compliance for healthcare data and payment processing systems while adhering to $50K budget constraint.',
        'Network Segmentation: Designed secure network segmentation strategy isolating sensitive data environments, implementing firewalls, VLANs, and access control lists.'
      ]
    },
    {
      title: 'Cybersecurity Architecture & Engineering',
      role: 'Architecture & Engineering Specialist',
      color: '#10b981',
      tags: ['SecurityX', 'Enterprise Architecture', 'Cloud Security', 'Threat Modeling', 'DLP'],
      scope: 'Advanced cybersecurity architecture and engineering competencies aligned with CompTIA SecurityX certification framework, focusing on enterprise-wide security solution design, cloud architecture security, threat analysis, and incident response strategy.',
      bullets: [
        'Enterprise Security Architecture: Evaluated and designed secure enterprise architecture solutions integrating security controls across distributed environments, ensuring alignment with organizational policies and compliance frameworks.',
        'Cloud & Virtualization Security: Analyzed cloud and virtualization security solutions, assessing architecture designs for Infrastructure-as-a-Service (IaaS), Platform-as-a-Service (PaaS), and Software-as-a-Service (SaaS) deployment models.',
        'Enterprise Data Security Controls: Applied enterprise-grade data protection controls including encryption, data loss prevention (DLP), rights management, and secure data lifecycle management across complex IT environments.',
        'Software Application Integration: Assessed security implications of integrating software applications within enterprise environments, evaluating API security, secure coding practices, and application architecture vulnerabilities.',
        'Threat & Vulnerability Analysis: Conducted comprehensive threat modeling and vulnerability assessment using industry-standard methodologies to identify security gaps in enterprise architecture designs.',
        'Incident Response & Recovery: Developed incident response strategies and business continuity plans aligned with organizational risk tolerance and regulatory requirements, ensuring resilient security operations.'
      ]
    },
    {
      title: 'Secure Software Design',
      role: 'Academic Focus',
      color: '#6366f1',
      tags: ['DevSecOps', 'SDLC', 'Agile', 'Defense in Depth'],
      bullets: [
        'Applied Defense in Depth principles across the entire SDLC.',
        'Adapted security activities to Agile and DevSecOps practices.'
      ]
    },
    {
      title: 'Cybersecurity Management',
      role: 'Chief Information Security Officer (CISO)',
      color: '#f59e0b',
      tags: ['CISO', 'GDPR', 'PCI DSS', 'NICE Framework', 'BCP/BIA', 'IRP'],
      scope: 'Led the strategic response to an independent security assessment for a retail bookseller (SAGE Books). Developed a comprehensive cybersecurity roadmap to remediate critical gaps in e-commerce security, governance, and regulatory compliance.',
      bullets: [
        'Regulatory Compliance & Mitigation: Developed enterprise-wide mitigation strategies to address framework gaps, ensuring strict alignment with PCI DSS and GDPR requirements for secure e-commerce and data privacy.',
        'Governance & Workforce Development: Identified and defined three critical security leadership roles using the NICE Framework to manage institutional risk, compliance, and governance functions.',
        'Vulnerability Analysis: Conducted a multifaceted threat assessment identifying three physical and three logical vulnerabilities, evaluating their direct impact on the organizations security posture.',
        'Security Awareness Training: Engineered a NIST-aligned cybersecurity awareness program encompassing annual requirements, specialized role-based training, and continuous awareness initiatives.',
        'Asset Protection Standards: Formalized organizational security standards and policies for Acceptable Use (AUP), Mobile Device Management (MDM), password complexity, and PII protection based on contractual and regulatory sources.',
        'Incident Response Planning: Authored a formal Incident Response Plan (IRP) structured around the four NIST incident handling phases to ensure rapid containment and recovery.',
        'Business Continuity & Resilience: Developed a comprehensive Business Continuity Plan (BCP) including project scoping, Business Impact Analysis (BIA), and implementation strategies to mitigate natural disaster risks.'
      ]
    },
    {
      title: 'Cybersecurity Graduate Capstone',
      role: 'WGU D490 | Security Architecture & Project Management',
      color: '#d97706',
      tags: ['Zero Trust', 'FISMA', 'NIST 800-53', 'Identity & Access', 'SOC', 'Project Management'],
      scope: 'Designed and evaluated a comprehensive five-component security transformation for a mid-sized U.S. federal agency (500 employees), integrating nine graduate-level cybersecurity courses into a cohesive security architecture addressing documented vulnerabilities, compliance deficiencies, and governance gaps.',
      bullets: [
        'Zero-Trust Network Architecture: Designed secure network segmentation across five security zones using HPE/Fortigate/Sophos firewalls, implementing least-privilege access controls and defense-in-depth principles to eliminate implicit trust.',
        'Identity & Access Management: Implemented centralized IAM via Okta with role-based access control (RBAC) and multi-factor authentication (MFA), achieving 100% least-privilege enforcement vs. current 30% effectiveness.',
        'Governance & Compliance Framework: Aligned security architecture with FISMA and NIST SP 800-53 controls, remediating 80%+ of audit findings and addressing 12 open federal audit issues.',
        'Secure Software Development Lifecycle: Established DevSecOps procedures integrating security testing, code review, and vulnerability scanning into development pipeline.',
        'Security Operations Center (SOC) Implementation: Configured Splunk-based real-time threat detection and incident response, reducing mean time to detect (MTTD) from 180+ days to 14 days.',
        'Enterprise Project Management: Developed comprehensive 8-month implementation plan with $913,320 budget allocation (hardware $192K, software $210K, services $87K, labor $688K), stakeholder engagement, and organizational change management.'
      ]
    }
  ]);

  filteredProjects = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.projects().filter((p: any) =>
      p.title.toLowerCase().includes(term) ||
      p.role.toLowerCase().includes(term) ||
      (p.tags && p.tags.some((t: string) => t.toLowerCase().includes(term)))
    );
  });

  totalProjects = computed(() => this.projects().length);
  isSearchActive = computed(() => this.searchTerm().trim().length > 0);

  onSearch(value: string) {
    this.isFiltering.set(true);
    this.searchTerm.set(value);
    setTimeout(() => this.isFiltering.set(false), 300);
  }

  openModal(project: any) {
    this.selectedProject.set(project);
    this.isClosing.set(false);
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.selectedProject.set(null);
      this.isClosing.set(false);
      document.body.style.overflow = 'auto';
    }, 240);
  }
}
