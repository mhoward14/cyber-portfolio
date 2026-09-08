/* ============================================================
   INCIDENT-RESPONSE-DATA.TS — INCIDENT RESPONSE PLAYBOOK SIMULATOR
   Grounded in NIST SP 800-61 Rev. 2 (Computer Security Incident
   Handling Guide) — public domain, U.S. government work. NIST 800-61
   defines the incident-response lifecycle and general best-practice
   principles (contain before you eradicate, preserve evidence,
   verify before acting, don't skip post-incident review); it does
   NOT provide a scenario-specific answer key. Every scenario,
   option, and optimal/suboptimal/poor grade below is original
   content applying those principles — not transcribed from an
   official rubric. Say so plainly in the UI disclaimer.
   ============================================================ */

export type ScenarioId = 'ransomware' | 'phishing' | 'insider-threat' | 'ddos';
export type IrPhaseId = 'detection' | 'containment' | 'post-incident';
export type Grade = 'optimal' | 'suboptimal' | 'poor';

export interface DecisionOption {
  id: string;
  text: string;
  grade: Grade;
  feedback: string;
}

export interface DecisionPoint {
  phase: IrPhaseId;
  narrative: string;
  options: DecisionOption[];
}

export interface Scenario {
  id: ScenarioId;
  name: string;
  teaser: string;
  iconKey: ScenarioId;
  decisions: DecisionPoint[];
}

export const IR_PHASE_LABELS: Record<'preparation' | IrPhaseId, string> = {
  preparation: 'Preparation',
  detection: 'Detection & Analysis',
  containment: 'Containment, Eradication & Recovery',
  'post-incident': 'Post-Incident Activity',
};

export const IR_PHASE_ORDER: IrPhaseId[] = ['detection', 'containment', 'post-incident'];

export const GRADE_LABELS: Record<Grade, string> = {
  optimal: 'Optimal',
  suboptimal: 'Suboptimal',
  poor: 'Poor',
};

export const NIST_IR_URL = 'https://csrc.nist.gov/pubs/sp/800/61/r2/final';

export const SCENARIOS: Scenario[] = [
  {
    id: 'ransomware',
    name: 'Ransomware Attack',
    teaser: 'File servers encrypted mid-shift, ransom note in hand — contain the spread without destroying the evidence.',
    iconKey: 'ransomware',
    decisions: [
      {
        phase: 'detection',
        narrative:
          "Multiple file servers are reporting encrypted files. A ransom note references a known ransomware family. " +
          "Help desk has logged 12 related calls in the last 20 minutes. What's your first move?",
        options: [
          {
            id: 'a',
            text: 'Immediately shut down all affected servers to stop the spread.',
            grade: 'suboptimal',
            feedback:
              'Shutting down does stop the spread, but it also wipes volatile memory and active network ' +
              'connections that could reveal the initial access vector and scope of compromise — isolation is ' +
              'the safer first move, preserving power state for analysis.',
          },
          {
            id: 'b',
            text: 'Isolate affected systems from the network while preserving them for forensic analysis.',
            grade: 'optimal',
            feedback:
              'Isolating preserves forensic evidence (memory, logs, indicators of compromise) while containing ' +
              "the spread — exactly what NIST SP 800-61's Detection & Analysis phase calls for before moving to " +
              'Containment.',
          },
          {
            id: 'c',
            text: 'Begin restoring from the most recent backup immediately.',
            grade: 'poor',
            feedback:
              "Restoring before you've contained the infection and identified how attackers got in risks " +
              're-encrypting the very data you just restored — Containment and root-cause analysis have to come first.',
          },
        ],
      },
      {
        phase: 'containment',
        narrative:
          'Forensic analysis confirms the ransomware spread through a compromised VPN account with no MFA. ' +
          "The affected servers are isolated. What's the right move now?",
        options: [
          {
            id: 'a',
            text: "Reset the compromised VPN credentials and immediately reconnect the isolated servers to the network.",
            grade: 'suboptimal',
            feedback:
              'Fixing the entry vector is necessary but not sufficient — reconnecting before confirming the ' +
              'servers themselves are clean risks the same ransomware re-spreading from an already-infected host.',
          },
          {
            id: 'b',
            text: 'Rebuild the affected servers from verified clean backups and enforce MFA on all VPN access before reconnecting.',
            grade: 'optimal',
            feedback:
              'This addresses both sides of Containment/Eradication/Recovery: verified-clean rebuilds eliminate ' +
              'any remaining malware, and closing the MFA gap prevents the same entry vector from being reused.',
          },
          {
            id: 'c',
            text: 'Pay the ransom to get a faster decryption key, then reconnect the servers.',
            grade: 'poor',
            feedback:
              "Paying doesn't guarantee a working key, funds further attacks, and does nothing to fix the " +
              "missing MFA that let attackers in — you'd likely be right back here.",
          },
        ],
      },
      {
        phase: 'post-incident',
        narrative:
          'The incident is contained and systems are back online. Leadership wants to move on. What should the ' +
          'response team do next?',
        options: [
          {
            id: 'a',
            text: 'Close the incident ticket — the systems are back up, so the incident is resolved.',
            grade: 'poor',
            feedback:
              "Systems being back online isn't the same as the incident being over — without a lessons-learned " +
              'review, the missing MFA gap (and whatever else let this happen) stays undocumented and likely unresolved.',
          },
          {
            id: 'b',
            text: 'Conduct a lessons-learned review within two weeks to document the root cause and update IR/VPN security procedures.',
            grade: 'optimal',
            feedback:
              "NIST SP 800-61 treats Post-Incident Activity as essential, not optional — a prompt review while " +
              'details are fresh turns a costly incident into concrete prevention, and directly closes the loop ' +
              'back into Preparation.',
          },
          {
            id: 'c',
            text: 'Wait until the next scheduled quarterly security review to discuss what happened.',
            grade: 'suboptimal',
            feedback:
              'A review eventually happens, but waiting a full quarter means details fade and the gap that ' +
              'caused this incident stays open far longer than it needs to.',
          },
        ],
      },
    ],
  },
  {
    id: 'phishing',
    name: 'Phishing Compromise',
    teaser: 'A finance-team credential was phished 40 minutes ago. Figure out how far the attacker got.',
    iconKey: 'phishing',
    decisions: [
      {
        phase: 'detection',
        narrative:
          'A finance employee reports clicking a link and entering their credentials on what looked like the ' +
          "company SSO page. It's been about 40 minutes. What's your first move?",
        options: [
          {
            id: 'a',
            text: "Immediately disable the employee's account and force a password reset.",
            grade: 'suboptimal',
            feedback:
              'Disabling the account is a good containment step, but doing it before checking whether the ' +
              "credential was actually used means you don't yet know if there's already a live session, " +
              'forwarding rule, or OAuth grant to deal with.',
          },
          {
            id: 'b',
            text: 'Review authentication and mailbox logs for the account to determine whether the credential was actually used, and from where.',
            grade: 'optimal',
            feedback:
              'This is the Detection & Analysis phase working as intended — you need to know the actual scope ' +
              '(was the credential used? from where? was MFA satisfied?) before you can contain the right things.',
          },
          {
            id: 'c',
            text: "Tell the employee it's fine since they realized their mistake quickly and reported it right away.",
            grade: 'poor',
            feedback:
              'Quick reporting is good, but it says nothing about whether the credential was actually used in ' +
              'those 40 minutes — assuming no impact without checking is exactly the gap that turns a phish into a breach.',
          },
        ],
      },
      {
        phase: 'containment',
        narrative:
          'Logs show a successful login from an unfamiliar IP two minutes after the phishing click, followed by ' +
          'a new mailbox forwarding rule being created. What now?',
        options: [
          {
            id: 'a',
            text: 'Delete the forwarding rule and consider the incident closed.',
            grade: 'poor',
            feedback:
              "Removing the forwarding rule addresses one symptom but leaves the attacker's session (and " +
              'possibly other changes made during it, like inbox rules or app permissions) untouched.',
          },
          {
            id: 'b',
            text: "Revoke the account's active sessions, remove the forwarding rule, reset credentials with MFA re-enrollment, and check for any other mailbox/OAuth changes made during the session.",
            grade: 'optimal',
            feedback:
              'Revoking active sessions closes the door immediately rather than waiting for a token to expire, ' +
              "and checking for other changes catches anything else the attacker did in that window — this is " +
              'full containment and eradication, not just cleanup of the one thing you noticed.',
          },
          {
            id: 'c',
            text: "Just reset the password — the old session will expire on its own eventually.",
            grade: 'poor',
            feedback:
              "A password reset doesn't invalidate an already-active session in most identity providers — the " +
              'attacker can keep using it until the session naturally expires or is explicitly revoked.',
          },
        ],
      },
      {
        phase: 'post-incident',
        narrative:
          'The compromised account is secured and no further suspicious activity is observed. What\'s the ' +
          'appropriate next step?',
        options: [
          {
            id: 'a',
            text: 'Add this phishing domain to the email filter blocklist and move on — one blocked domain is enough.',
            grade: 'suboptimal',
            feedback:
              'Blocking the domain helps a little, but attackers rotate domains constantly — it\'s a minor ' +
              'mitigation, not a fix for the underlying gap.',
          },
          {
            id: 'b',
            text: 'Document the timeline, review why the phishing email reached the inbox, and use the incident as a trigger for targeted awareness training.',
            grade: 'optimal',
            feedback:
              "A single blocked domain doesn't stop the next lookalike domain — documenting why the email got " +
              'through (filtering gap? no banner? training gap?) is what actually reduces the next incident\'s likelihood.',
          },
          {
            id: 'c',
            text: 'Since only one account was affected, no further action is needed.',
            grade: 'poor',
            feedback:
              "One compromised account today doesn't mean the same phishing template won't land in ten more " +
              'inboxes tomorrow — skipping the review just guarantees you\'ll be here again.',
          },
        ],
      },
    ],
  },
  {
    id: 'insider-threat',
    name: 'Insider Threat',
    teaser: 'A soon-to-be-terminated employee is pulling large volumes of data after hours. Move carefully.',
    iconKey: 'insider-threat',
    decisions: [
      {
        phase: 'detection',
        narrative:
          'DLP alerts show an employee who was notified of termination yesterday has downloaded several ' +
          "gigabytes of customer data to a personal USB device overnight. What's your first move?",
        options: [
          {
            id: 'a',
            text: 'Walk over and confront the employee directly to ask what they\'re doing.',
            grade: 'poor',
            feedback:
              "Confronting the employee directly risks tipping them off before you've confirmed the scope, and " +
              'gives them a chance to destroy evidence or accelerate exfiltration before any containment happens.',
          },
          {
            id: 'b',
            text: 'Quietly verify the DLP alert against access logs and involve HR/Legal before taking any visible action.',
            grade: 'optimal',
            feedback:
              'Insider cases are as much an HR/Legal matter as a technical one — verifying the facts and ' +
              'coordinating before acting protects the investigation, follows proper procedure, and avoids ' +
              'tipping off someone who may still have physical access or other accounts.',
          },
          {
            id: 'c',
            text: 'Immediately disable all of the employee\'s access without looping in HR or Legal.',
            grade: 'suboptimal',
            feedback:
              'Disabling access is a reasonable eventual step, but skipping HR/Legal coordination on a ' +
              'termination-adjacent case can create legal exposure and misses context (like whether this needs ' +
              'to go to law enforcement) that only they have.',
          },
        ],
      },
      {
        phase: 'containment',
        narrative:
          'HR and Legal confirm this should be treated as a formal insider investigation. What\'s the ' +
          'appropriate technical containment step?',
        options: [
          {
            id: 'a',
            text: 'Disable the employee\'s accounts and physical access badges in a coordinated, documented action once HR/Legal give the go-ahead.',
            grade: 'optimal',
            feedback:
              'A coordinated, fully-documented cutoff — timed with HR/Legal — closes every access path at once ' +
              'and creates the record you\'ll need if this goes further.',
          },
          {
            id: 'b',
            text: 'Wait until the employee\'s official last day to make any access changes.',
            grade: 'poor',
            feedback:
              'Waiting for the official last day gives someone who already knows they\'re being let go days of ' +
              'continued access to keep exfiltrating data.',
          },
          {
            id: 'c',
            text: 'Disable only their VPN access, leaving badge and other system access active for now.',
            grade: 'suboptimal',
            feedback:
              'Partial containment leaves real gaps — badge access alone could still mean removable media use ' +
              'or direct system access outside VPN.',
          },
        ],
      },
      {
        phase: 'post-incident',
        narrative:
          'The investigation is handed to Legal and access has been fully revoked. What should the security ' +
          'team do next?',
        options: [
          {
            id: 'a',
            text: 'Review how the DLP alert was configured and confirm similar exfiltration patterns would be caught in the future.',
            grade: 'optimal',
            feedback:
              'The technical review (did detection work as intended? would a slower exfiltration have been ' +
              'caught?) is exactly what turns one insider case into a stronger detection posture for the next ' +
              'one — that work is separate from and doesn\'t wait on the legal process.',
          },
          {
            id: 'b',
            text: 'Consider the technical portion complete since Legal has the case now.',
            grade: 'poor',
            feedback:
              'Handing the case to Legal ends the legal process, not the security team\'s job of learning from ' +
              'how the detection and response actually performed.',
          },
          {
            id: 'c',
            text: 'Only document this if Legal specifically requests it later.',
            grade: 'poor',
            feedback:
              'Waiting to be asked means the review often never happens — documenting your own after-action ' +
              'findings promptly is standard practice, not something to wait on.',
          },
        ],
      },
    ],
  },
  {
    id: 'ddos',
    name: 'DDoS Attack',
    teaser: "Traffic to the public site just spiked 40x. Customers can't check out. Every minute counts.",
    iconKey: 'ddos',
    decisions: [
      {
        phase: 'detection',
        narrative:
          'Monitoring shows inbound traffic to the public web application spiking to 40x normal volume. The ' +
          "checkout page is timing out for real customers. What's your first move?",
        options: [
          {
            id: 'a',
            text: 'Immediately take the web application offline to stop the flood from reaching backend systems.',
            grade: 'poor',
            feedback:
              'Taking the app fully offline stops the attack from hitting it, but it also finishes the job for ' +
              'the attacker — real customers are now completely locked out instead of just degraded.',
          },
          {
            id: 'b',
            text: 'Confirm this is actually a DDoS (not a legitimate traffic spike or an internal issue) by checking traffic patterns/source diversity, then engage upstream DDoS mitigation (CDN/scrubbing).',
            grade: 'optimal',
            feedback:
              'Confirming it\'s actually a DDoS (versus, say, a viral link or a misbehaving internal job) before ' +
              'reacting avoids a wrong response, and going straight to upstream mitigation is the right lever — ' +
              'trying to fight volumetric traffic at your own edge rarely works.',
          },
          {
            id: 'c',
            text: 'Wait and see if the traffic dies down on its own before doing anything.',
            grade: 'poor',
            feedback:
              'DDoS attacks can run for hours; every minute of "wait and see" is a minute of real customers ' +
              'unable to check out.',
          },
        ],
      },
      {
        phase: 'containment',
        narrative:
          'Upstream mitigation is engaged and scrubbing malicious traffic. Legitimate traffic is slowly ' +
          "recovering. What's the right next step?",
        options: [
          {
            id: 'a',
            text: 'Consider it resolved once the checkout page loads normally again.',
            grade: 'suboptimal',
            feedback:
              'The checkout page working again is a good sign, but "resolved" implies you\'re done — attackers ' +
              'often retry or shift tactics shortly after, so this needs continued monitoring, not a checked box.',
          },
          {
            id: 'b',
            text: 'Tune mitigation rules based on the observed attack traffic pattern, and monitor closely in case the attacker shifts tactics (a different vector or target).',
            grade: 'optimal',
            feedback:
              'DDoS attackers frequently pivot to a different vector or target once the first is mitigated — ' +
              'tuning your rules to what you actually observed and staying watchful is what keeps the recovery ' +
              'from being temporary.',
          },
          {
            id: 'c',
            text: 'Disable upstream mitigation immediately once traffic looks normal, to restore full performance.',
            grade: 'poor',
            feedback:
              'Pulling mitigation the moment things look normal is exactly when a second wave (or a shifted ' +
              'attack) is most likely to land unmitigated.',
          },
        ],
      },
      {
        phase: 'post-incident',
        narrative: 'Traffic has been normal for 24 hours. What should the team do to close this out?',
        options: [
          {
            id: 'a',
            text: 'Document the attack timeline, mitigation effectiveness, and any capacity/architecture gaps it exposed, and feed findings back into DDoS response runbooks.',
            grade: 'optimal',
            feedback:
              'Every DDoS event is data about your actual attack surface and mitigation performance — feeding ' +
              'it back into runbooks and architecture decisions is what shortens the response time on the next one.',
          },
          {
            id: 'b',
            text: 'No further action needed since upstream mitigation handled it automatically.',
            grade: 'poor',
            feedback:
              'Automated mitigation working well is great, but it doesn\'t capture what you learned about your ' +
              'own exposure, response timing, or whether the mitigation could be tuned even better.',
          },
          {
            id: 'c',
            text: 'Just note the date in an internal chat channel in case someone asks about it later.',
            grade: 'suboptimal',
            feedback:
              'A chat note is better than nothing, but it isn\'t a record anyone can act on — a real debrief is ' +
              'what actually improves the next response.',
          },
        ],
      },
    ],
  },
];
