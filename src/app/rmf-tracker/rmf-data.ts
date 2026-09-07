/**
 * RMF Control Tracker — NIST SP 800-53 Rev 5 baseline dataset
 *
 * A curated subset (~140 base controls, no control enhancements) across all
 * 20 NIST 800-53 Rev 5 families, tagged with the lowest FIPS 199 impact
 * baseline (Low/Moderate/High) each first appears in per NIST SP 800-53B.
 * High is a superset of Moderate, which is a superset of Low.
 *
 * This is a curated subset for demonstration purposes, not the complete
 * official tailoring. For the authoritative baselines, see NIST SP 800-53B:
 * https://csrc.nist.gov/pubs/sp/800/53/b/upd1/final
 *
 * All content here is original public-domain-based U.S. government material
 * (NIST SP 800-53 is a U.S. government work) — discussion text is a short
 * paraphrase of each control's intent, not verbatim quotation.
 */

export type Tier = 'low' | 'moderate' | 'high';
export type ControlStatus = 'implemented' | 'partial' | 'not-implemented' | 'na';

export interface BaselineControl {
  id: string;
  family: string;
  title: string;
  discussion: string;
  baseline: Tier;
}

export const TIER_ORDER: Record<Tier, number> = { low: 0, moderate: 1, high: 2 };

export const STATUS_LABEL: Record<ControlStatus, string> = {
  implemented: 'Implemented',
  partial: 'Partial',
  'not-implemented': 'Not Implemented',
  na: 'N/A'
};

export const NIST_800_53B_URL = 'https://csrc.nist.gov/pubs/sp/800/53/b/upd1/final';

const RAW_CONTROLS: [string, string, string, string, Tier][] = [
  // Access Control
  ['AC-1', 'Access Control', 'Policy and Procedures', 'Develop, document, and disseminate an access control policy and supporting procedures.', 'low'],
  ['AC-2', 'Access Control', 'Account Management', 'Define account types, establish conditions for group/role membership, and monitor account use.', 'low'],
  ['AC-3', 'Access Control', 'Access Enforcement', 'Enforce approved authorizations for logical access in accordance with policy.', 'low'],
  ['AC-4', 'Access Control', 'Information Flow Enforcement', 'Control the flow of information within the system and between connected systems.', 'moderate'],
  ['AC-5', 'Access Control', 'Separation of Duties', 'Separate duties of individuals to reduce the risk of malicious activity without collusion.', 'moderate'],
  ['AC-6', 'Access Control', 'Least Privilege', 'Allow only authorized accesses necessary to accomplish assigned tasks.', 'moderate'],
  ['AC-7', 'Access Control', 'Unsuccessful Logon Attempts', 'Enforce a limit on consecutive invalid logon attempts within a defined time period.', 'low'],
  ['AC-8', 'Access Control', 'System Use Notification', 'Display an approved notification banner before granting system access.', 'low'],
  ['AC-11', 'Access Control', 'Device Lock', 'Prevent further access after a period of inactivity by initiating a device lock.', 'moderate'],
  ['AC-17', 'Access Control', 'Remote Access', 'Establish usage restrictions and implementation guidance for remote access.', 'low'],
  ['AC-18', 'Access Control', 'Wireless Access', 'Establish configuration requirements and usage restrictions for wireless access.', 'low'],
  ['AC-19', 'Access Control', 'Access Control for Mobile Devices', 'Establish usage restrictions for organization-controlled mobile devices.', 'low'],
  ['AC-20', 'Access Control', 'Use of External Systems', 'Establish terms and conditions for accessing the system from external systems.', 'low'],
  ['AC-22', 'Access Control', 'Publicly Accessible Content', 'Designate individuals authorized to post information onto a public system.', 'low'],
  // Awareness and Training
  ['AT-1', 'Awareness & Training', 'Policy and Procedures', 'Develop, document, and disseminate an awareness and training policy.', 'low'],
  ['AT-2', 'Awareness & Training', 'Literacy Training and Awareness', 'Provide security and privacy literacy training to system users.', 'low'],
  ['AT-3', 'Awareness & Training', 'Role-Based Training', 'Provide role-based training before authorizing access or performing duties.', 'low'],
  ['AT-4', 'Awareness & Training', 'Training Records', 'Document and monitor individual training activities.', 'low'],
  // Audit and Accountability
  ['AU-1', 'Audit & Accountability', 'Policy and Procedures', 'Develop, document, and disseminate an audit and accountability policy.', 'low'],
  ['AU-2', 'Audit & Accountability', 'Event Logging', 'Identify the types of events the system is capable of logging.', 'low'],
  ['AU-3', 'Audit & Accountability', 'Content of Audit Records', 'Ensure audit records contain information establishing what/when/where/who/outcome.', 'low'],
  ['AU-4', 'Audit & Accountability', 'Audit Log Storage Capacity', 'Allocate audit log storage capacity to accommodate retention requirements.', 'low'],
  ['AU-5', 'Audit & Accountability', 'Response to Audit Logging Process Failures', 'Alert designated personnel in the event of an audit logging process failure.', 'low'],
  ['AU-6', 'Audit & Accountability', 'Audit Record Review, Analysis & Reporting', 'Review and analyze system audit records for indications of inappropriate activity.', 'low'],
  ['AU-8', 'Audit & Accountability', 'Time Stamps', 'Use internal system clocks to generate time stamps for audit records.', 'low'],
  ['AU-9', 'Audit & Accountability', 'Protection of Audit Information', 'Protect audit information and audit logging tools from unauthorized access.', 'low'],
  ['AU-11', 'Audit & Accountability', 'Audit Record Retention', 'Retain audit records to provide support for after-the-fact investigations.', 'low'],
  ['AU-12', 'Audit & Accountability', 'Audit Record Generation', 'Provide audit record generation capability for defined auditable events.', 'low'],
  // Assessment, Authorization, and Monitoring
  ['CA-1', 'Assessment & Authorization', 'Policy and Procedures', 'Develop, document, and disseminate a control assessment and authorization policy.', 'low'],
  ['CA-2', 'Assessment & Authorization', 'Control Assessments', 'Assess the controls in the system to determine their effectiveness.', 'low'],
  ['CA-3', 'Assessment & Authorization', 'Information Exchange', 'Approve and manage the exchange of information between systems.', 'low'],
  ['CA-5', 'Assessment & Authorization', 'Plan of Action and Milestones', 'Develop a POA&M to document planned remediation actions.', 'low'],
  ['CA-6', 'Assessment & Authorization', 'Authorization', 'Assign a senior official to authorize the system to operate.', 'low'],
  ['CA-7', 'Assessment & Authorization', 'Continuous Monitoring', 'Develop a continuous monitoring strategy and implement the program.', 'low'],
  ['CA-9', 'Assessment & Authorization', 'Internal System Connections', 'Authorize internal connections of system components to the system.', 'low'],
  // Configuration Management
  ['CM-1', 'Configuration Management', 'Policy and Procedures', 'Develop, document, and disseminate a configuration management policy.', 'low'],
  ['CM-2', 'Configuration Management', 'Baseline Configuration', 'Develop and maintain a current baseline configuration of the system.', 'low'],
  ['CM-3', 'Configuration Management', 'Configuration Change Control', 'Determine and document the types of changes that are configuration-controlled.', 'moderate'],
  ['CM-4', 'Configuration Management', 'Impact Analyses', 'Analyze changes to the system to determine potential security impacts.', 'moderate'],
  ['CM-5', 'Configuration Management', 'Access Restrictions for Change', 'Define, document, and enforce physical/logical access restrictions for changes.', 'moderate'],
  ['CM-6', 'Configuration Management', 'Configuration Settings', 'Establish and document configuration settings using the most restrictive mode.', 'low'],
  ['CM-7', 'Configuration Management', 'Least Functionality', 'Configure the system to provide only essential capabilities.', 'low'],
  ['CM-8', 'Configuration Management', 'System Component Inventory', 'Develop and maintain an inventory of system components.', 'low'],
  ['CM-10', 'Configuration Management', 'Software Usage Restrictions', 'Use software and documentation in accordance with contract agreements.', 'low'],
  ['CM-11', 'Configuration Management', 'User-Installed Software', 'Establish policies governing installation of software by users.', 'low'],
  // Contingency Planning
  ['CP-1', 'Contingency Planning', 'Policy and Procedures', 'Develop, document, and disseminate a contingency planning policy.', 'low'],
  ['CP-2', 'Contingency Planning', 'Contingency Plan', 'Develop a contingency plan for the system.', 'low'],
  ['CP-3', 'Contingency Planning', 'Contingency Training', 'Provide contingency training to system users consistent with assigned roles.', 'moderate'],
  ['CP-4', 'Contingency Planning', 'Contingency Plan Testing', 'Test the contingency plan to determine its effectiveness.', 'moderate'],
  ['CP-9', 'Contingency Planning', 'System Backup', 'Conduct backups of user-level and system-level information.', 'low'],
  ['CP-10', 'Contingency Planning', 'System Recovery and Reconstitution', 'Provide for recovery and reconstitution of the system after a disruption.', 'low'],
  // Identification and Authentication
  ['IA-1', 'Identification & Authentication', 'Policy and Procedures', 'Develop, document, and disseminate an identification and authentication policy.', 'low'],
  ['IA-2', 'Identification & Authentication', 'Identification and Authentication (Org Users)', 'Uniquely identify and authenticate organizational users.', 'low'],
  ['IA-3', 'Identification & Authentication', 'Device Identification and Authentication', 'Uniquely identify and authenticate devices before connection.', 'moderate'],
  ['IA-4', 'Identification & Authentication', 'Identifier Management', 'Manage system identifiers by receiving authorization and preventing reuse.', 'low'],
  ['IA-5', 'Identification & Authentication', 'Authenticator Management', 'Manage system authenticators including issuance, revocation, and refresh.', 'low'],
  ['IA-6', 'Identification & Authentication', 'Authentication Feedback', 'Obscure feedback of authentication information during the process.', 'low'],
  ['IA-8', 'Identification & Authentication', 'Identification and Authentication (Non-Org Users)', 'Uniquely identify and authenticate non-organizational users.', 'low'],
  ['IA-11', 'Identification & Authentication', 'Re-authentication', 'Require users and devices to re-authenticate under defined circumstances.', 'low'],
  // Incident Response
  ['IR-1', 'Incident Response', 'Policy and Procedures', 'Develop, document, and disseminate an incident response policy.', 'low'],
  ['IR-2', 'Incident Response', 'Incident Response Training', 'Provide incident response training consistent with assigned roles.', 'low'],
  ['IR-3', 'Incident Response', 'Incident Response Testing', 'Test the incident response capability to determine its effectiveness.', 'moderate'],
  ['IR-4', 'Incident Response', 'Incident Handling', 'Implement an incident handling capability covering preparation through recovery.', 'low'],
  ['IR-5', 'Incident Response', 'Incident Monitoring', 'Track and document system security incidents.', 'low'],
  ['IR-6', 'Incident Response', 'Incident Reporting', 'Require personnel to report suspected incidents within a defined time.', 'low'],
  ['IR-8', 'Incident Response', 'Incident Response Plan', 'Develop an incident response plan addressing roles, communication, and metrics.', 'low'],
  // Maintenance
  ['MA-1', 'Maintenance', 'Policy and Procedures', 'Develop, document, and disseminate a system maintenance policy.', 'low'],
  ['MA-2', 'Maintenance', 'Controlled Maintenance', 'Schedule, document, and review records of system maintenance.', 'low'],
  ['MA-3', 'Maintenance', 'Maintenance Tools', 'Approve, control, and monitor the use of system maintenance tools.', 'moderate'],
  ['MA-4', 'Maintenance', 'Nonlocal Maintenance', 'Approve and monitor nonlocal maintenance and diagnostic activities.', 'low'],
  ['MA-5', 'Maintenance', 'Maintenance Personnel', 'Establish a process for maintenance personnel authorization.', 'low'],
  // Media Protection
  ['MP-1', 'Media Protection', 'Policy and Procedures', 'Develop, document, and disseminate a media protection policy.', 'low'],
  ['MP-2', 'Media Protection', 'Media Access', 'Restrict access to system media to authorized personnel.', 'low'],
  ['MP-3', 'Media Protection', 'Media Marking', 'Mark system media indicating distribution limitations and handling caveats.', 'moderate'],
  ['MP-4', 'Media Protection', 'Media Storage', 'Physically control and securely store system media within controlled areas.', 'moderate'],
  ['MP-5', 'Media Protection', 'Media Transport', 'Protect and control system media during transport outside controlled areas.', 'moderate'],
  ['MP-6', 'Media Protection', 'Media Sanitization', 'Sanitize system media prior to disposal, release, or reuse.', 'low'],
  ['MP-7', 'Media Protection', 'Media Use', 'Restrict or prohibit the use of defined types of system media.', 'low'],
  // Physical and Environmental Protection
  ['PE-1', 'Physical & Environmental', 'Policy and Procedures', 'Develop, document, and disseminate a physical/environmental protection policy.', 'low'],
  ['PE-2', 'Physical & Environmental', 'Physical Access Authorizations', 'Develop, approve, and maintain a list of individuals with authorized access.', 'low'],
  ['PE-3', 'Physical & Environmental', 'Physical Access Control', 'Enforce physical access authorizations at defined entry/exit points.', 'low'],
  ['PE-6', 'Physical & Environmental', 'Monitoring Physical Access', 'Monitor physical access to the facility to detect and respond to incidents.', 'low'],
  ['PE-8', 'Physical & Environmental', 'Visitor Access Records', 'Maintain visitor access records to the facility for a defined time period.', 'low'],
  ['PE-13', 'Physical & Environmental', 'Fire Protection', 'Employ and maintain fire suppression and detection devices/systems.', 'low'],
  ['PE-14', 'Physical & Environmental', 'Environmental Controls', 'Maintain temperature and humidity levels within acceptable ranges.', 'low'],
  ['PE-16', 'Physical & Environmental', 'Delivery and Removal', 'Authorize, monitor, and control system components entering/exiting the facility.', 'low'],
  ['PE-17', 'Physical & Environmental', 'Alternate Work Site', 'Determine and document alternate work site security requirements.', 'moderate'],
  // Planning
  ['PL-1', 'Planning', 'Policy and Procedures', 'Develop, document, and disseminate a security and privacy planning policy.', 'low'],
  ['PL-2', 'Planning', 'System Security and Privacy Plans', 'Develop plans that reflect the security categorization and control set.', 'low'],
  ['PL-4', 'Planning', 'Rules of Behavior', 'Establish rules describing user responsibilities for system use.', 'low'],
  ['PL-8', 'Planning', 'Security and Privacy Architectures', 'Develop architectures aligned with the enterprise security architecture.', 'moderate'],
  ['PL-10', 'Planning', 'Baseline Selection', 'Select a control baseline for the system.', 'low'],
  ['PL-11', 'Planning', 'Baseline Tailoring', 'Tailor the selected control baseline to align with mission needs.', 'low'],
  // Program Management (organization-wide)
  ['PM-1', 'Program Management', 'Information Security Program Plan', 'Develop and disseminate an organization-wide information security program plan.', 'low'],
  ['PM-9', 'Program Management', 'Risk Management Strategy', 'Develop a comprehensive strategy to manage risk to operations and assets.', 'low'],
  ['PM-14', 'Program Management', 'Testing, Training, and Monitoring', 'Implement a process to ensure security/privacy plans remain executable.', 'low'],
  // Personnel Security
  ['PS-1', 'Personnel Security', 'Policy and Procedures', 'Develop, document, and disseminate a personnel security policy.', 'low'],
  ['PS-2', 'Personnel Security', 'Position Risk Designation', 'Assign a risk designation to all organizational positions.', 'low'],
  ['PS-3', 'Personnel Security', 'Personnel Screening', 'Screen individuals prior to authorizing access to the system.', 'low'],
  ['PS-4', 'Personnel Security', 'Personnel Termination', 'Disable system access and conduct exit interviews upon termination.', 'low'],
  ['PS-6', 'Personnel Security', 'Access Agreements', 'Develop and document access agreements for individuals requiring access.', 'low'],
  ['PS-7', 'Personnel Security', 'External Personnel Security', 'Establish personnel security requirements for external providers.', 'low'],
  // PII Processing and Transparency
  ['PT-1', 'PII Processing & Transparency', 'Policy and Procedures', 'Develop, document, and disseminate a PII processing and transparency policy.', 'low'],
  ['PT-2', 'PII Processing & Transparency', 'Authority to Process PII', 'Determine and document the legal authority permitting PII collection.', 'low'],
  ['PT-3', 'PII Processing & Transparency', 'PII Processing Purposes', 'Identify and document the purpose(s) for processing PII.', 'low'],
  // Risk Assessment
  ['RA-1', 'Risk Assessment', 'Policy and Procedures', 'Develop, document, and disseminate a risk assessment policy.', 'low'],
  ['RA-2', 'Risk Assessment', 'Security Categorization', 'Categorize the system and document the categorization results.', 'low'],
  ['RA-3', 'Risk Assessment', 'Risk Assessment', 'Conduct a risk assessment, including likelihood and impact of harm.', 'low'],
  ['RA-5', 'Risk Assessment', 'Vulnerability Monitoring and Scanning', 'Monitor and scan for vulnerabilities in the system on a defined frequency.', 'low'],
  ['RA-7', 'Risk Assessment', 'Risk Response', 'Respond to findings from control assessments and monitoring.', 'low'],
  // System and Services Acquisition
  ['SA-1', 'System & Services Acquisition', 'Policy and Procedures', 'Develop, document, and disseminate a system/services acquisition policy.', 'low'],
  ['SA-3', 'System & Services Acquisition', 'System Development Life Cycle', 'Manage the system using a documented development life cycle.', 'low'],
  ['SA-4', 'System & Services Acquisition', 'Acquisition Process', 'Include security/privacy requirements in acquisition contracts.', 'low'],
  ['SA-5', 'System & Services Acquisition', 'System Documentation', 'Obtain and protect administrator/user documentation for the system.', 'low'],
  ['SA-8', 'System & Services Acquisition', 'Security & Privacy Engineering Principles', 'Apply engineering principles in specification and design of the system.', 'low'],
  ['SA-9', 'System & Services Acquisition', 'External System Services', 'Require external providers to comply with applicable security requirements.', 'low'],
  ['SA-10', 'System & Services Acquisition', 'Developer Configuration Management', 'Require developers to perform configuration management during design.', 'moderate'],
  ['SA-11', 'System & Services Acquisition', 'Developer Testing and Evaluation', 'Require developers to create and implement a security assessment plan.', 'moderate'],
  ['SA-22', 'System & Services Acquisition', 'Unsupported System Components', 'Replace system components when support is no longer available.', 'low'],
  // System and Communications Protection
  ['SC-1', 'System & Comms Protection', 'Policy and Procedures', 'Develop, document, and disseminate a system/communications protection policy.', 'low'],
  ['SC-5', 'System & Comms Protection', 'Denial-of-Service Protection', 'Protect against or limit the effects of denial-of-service events.', 'low'],
  ['SC-7', 'System & Comms Protection', 'Boundary Protection', 'Monitor and control communications at external/key internal boundaries.', 'low'],
  ['SC-8', 'System & Comms Protection', 'Transmission Confidentiality and Integrity', 'Protect the confidentiality/integrity of transmitted information.', 'moderate'],
  ['SC-12', 'System & Comms Protection', 'Cryptographic Key Establishment & Management', 'Establish and manage cryptographic keys when used.', 'low'],
  ['SC-13', 'System & Comms Protection', 'Cryptographic Protection', 'Implement defined cryptographic uses and types of cryptography required.', 'low'],
  ['SC-15', 'System & Comms Protection', 'Collaborative Computing Devices', 'Prohibit remote activation of collaborative computing devices with exceptions.', 'low'],
  ['SC-20', 'System & Comms Protection', 'Secure Name/Address Resolution (Authoritative)', 'Provide additional data origin/integrity artifacts for name/address resolution.', 'low'],
  ['SC-28', 'System & Comms Protection', 'Protection of Information at Rest', 'Protect the confidentiality/integrity of information at rest.', 'moderate'],
  ['SC-39', 'System & Comms Protection', 'Process Isolation', 'Maintain a separate execution domain for each executing process.', 'low'],
  // System and Information Integrity
  ['SI-1', 'System & Information Integrity', 'Policy and Procedures', 'Develop, document, and disseminate a system/information integrity policy.', 'low'],
  ['SI-2', 'System & Information Integrity', 'Flaw Remediation', 'Identify, report, and correct system flaws.', 'low'],
  ['SI-3', 'System & Information Integrity', 'Malicious Code Protection', 'Implement signature/non-signature-based malicious code protection.', 'low'],
  ['SI-4', 'System & Information Integrity', 'System Monitoring', 'Monitor the system to detect attacks and indicators of potential attacks.', 'low'],
  ['SI-5', 'System & Information Integrity', 'Security Alerts, Advisories & Directives', 'Receive and act on system security alerts, advisories, and directives.', 'low'],
  ['SI-7', 'System & Information Integrity', 'Software, Firmware & Information Integrity', 'Employ integrity verification tools to detect unauthorized changes.', 'moderate'],
  ['SI-8', 'System & Information Integrity', 'Spam Protection', 'Implement spam protection mechanisms at system entry/exit points.', 'moderate'],
  ['SI-10', 'System & Information Integrity', 'Information Input Validation', 'Check the validity of information inputs.', 'moderate'],
  ['SI-12', 'System & Information Integrity', 'Information Management and Retention', 'Manage and retain information within the system per applicable requirements.', 'low'],
  // Supply Chain Risk Management
  ['SR-1', 'Supply Chain Risk Mgmt', 'Policy and Procedures', 'Develop, document, and disseminate a supply chain risk management policy.', 'low'],
  ['SR-2', 'Supply Chain Risk Mgmt', 'Supply Chain Risk Management Plan', 'Develop a plan for managing supply chain risks to the system.', 'low'],
  ['SR-3', 'Supply Chain Risk Mgmt', 'Supply Chain Controls and Processes', 'Establish a process to identify and address weaknesses in the supply chain.', 'low'],
  ['SR-8', 'Supply Chain Risk Mgmt', 'Notification Agreements', 'Establish agreements for notification of supply chain compromises.', 'low'],
  ['SR-11', 'Supply Chain Risk Mgmt', 'Component Authenticity', 'Develop anti-counterfeit policy and train personnel to detect counterfeits.', 'low']
];

export const CONTROLS: BaselineControl[] = RAW_CONTROLS.map(([id, family, title, discussion, baseline]) => ({
  id,
  family,
  title,
  discussion,
  baseline
}));
