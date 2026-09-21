/* ============================================================
   TRANSACTION-SECURITY-DATA.TS — DIGITAL TRANSACTION SECURITY
   EXPLORER
   Walks a payment transaction through its lifecycle for three
   transaction types (card-present, card-not-present, and ACH/bank
   transfer) and maps each stage's secure/insecure configuration to
   the underlying standard: PCI DSS v4.0 for card transactions, and
   the NACHA Operating Rules for ACH. Control numbers and rule
   citations describe general, well-known practices rather than
   quoting a specific requirement's exact text — this tool presents
   original, illustrative transaction flows, not an official PCI SSC
   or NACHA assessment tool. Say so plainly in the UI disclaimer.
   ============================================================ */

export type TransactionTypeId = 'card-present' | 'card-not-present' | 'ach';

export interface TransactionStage {
  id: string;
  name: string;
  settingLabel: string;
  secureValue: string;
  insecureValue: string;
  explanation: string;
  controlReference: string;
}

export interface TransactionTypeConfig {
  id: TransactionTypeId;
  name: string;
  shortName: string;
  description: string;
  standardName: string;
  standardUrl: string;
  stages: TransactionStage[];
}

export const TRANSACTION_TYPES: TransactionTypeConfig[] = [
  {
    id: 'card-present',
    name: 'Card-Present (Chip/Contactless)',
    shortName: 'Card-Present',
    description: 'A customer pays at a physical terminal using a chip, contactless, or magnetic-stripe card.',
    standardName: 'PCI Data Security Standard (PCI DSS) v4.0',
    standardUrl: 'https://www.pcisecuritystandards.org/document_library/',
    stages: [
      {
        id: 'capture',
        name: 'Capture',
        settingLabel: 'Card-read method',
        secureValue: 'EMV chip / contactless (dynamic cryptogram)',
        insecureValue: 'Magnetic-stripe swipe (static PAN)',
        explanation:
          'A magnetic-stripe swipe exposes the full, static primary account number (PAN) and is trivially cloned onto a blank card. EMV chip and contactless transactions generate a one-time cryptogram per transaction, so a captured value cannot be replayed.',
        controlReference: 'PCI DSS Req. 4 — protect cardholder data during capture; EMV specification',
      },
      {
        id: 'p2pe',
        name: 'Point-to-Point Encryption',
        settingLabel: 'Terminal-to-processor encryption',
        secureValue: 'PCI-validated P2PE (encrypted at the reader)',
        insecureValue: 'Cleartext PAN on the POS network',
        explanation:
          'Without point-to-point encryption, cardholder data travels in the clear across the merchant’s internal network the moment it leaves the reader — the mechanism behind several large retail POS breaches, where malware sniffing that internal segment captured card data at scale.',
        controlReference: 'PCI DSS Req. 4.2 — strong cryptography for transmission over open, public networks',
      },
      {
        id: 'tokenize',
        name: 'Tokenization',
        settingLabel: 'Post-authorization data handling',
        secureValue: 'PAN replaced with a payment token',
        insecureValue: 'Raw PAN retained in POS/back-office systems',
        explanation:
          'Storing the raw PAN after authorization (for receipts, loyalty lookups, or chargebacks) creates a high-value target with no operational benefit. A token can support the same workflows without ever exposing the real account number again.',
        controlReference: 'PCI DSS Req. 3 — protect stored account data; scope-reduction guidance',
      },
      {
        id: 'segmentation',
        name: 'Network Segmentation',
        settingLabel: 'POS network placement',
        secureValue: 'Dedicated, segmented cardholder data environment (CDE)',
        insecureValue: 'POS terminals share a flat network with general business systems',
        explanation:
          'A flat network lets an attacker who compromises an unrelated system (a marketing workstation, an HVAC vendor connection) move laterally straight into the POS estate. Segmentation limits both the initial attack surface and how far a compromise can spread.',
        controlReference: 'PCI DSS Req. 1 — network security controls; segmentation guidance',
      },
      {
        id: 'authorization',
        name: 'Authorization',
        settingLabel: 'Transaction verification',
        secureValue: 'EMV cryptogram verified + velocity/fraud scoring',
        insecureValue: 'Static PAN and expiration date only, no fraud scoring',
        explanation:
          'Authorizing on the card number and expiration date alone accepts any successfully captured (or guessed) card data. Verifying the EMV cryptogram and applying velocity/fraud scoring catches replay and card-testing patterns before funds move.',
        controlReference: 'PCI DSS Req. 8 — authenticate access; issuer fraud-scoring practice',
      },
      {
        id: 'monitoring',
        name: 'Logging & Monitoring',
        settingLabel: 'Payment-system visibility',
        secureValue: 'Centralized logging across POS and payment systems',
        insecureValue: 'No centralized logging of payment systems',
        explanation:
          'Centralized log collection is what turns a POS compromise from a months-long undetected breach into an incident caught in hours or days — most major retail breaches were discovered by outside parties, not the merchant’s own monitoring.',
        controlReference: 'PCI DSS Req. 10 — log and monitor all access to system components and cardholder data',
      },
    ],
  },
  {
    id: 'card-not-present',
    name: 'Card-Not-Present (E-Commerce)',
    shortName: 'Card-Not-Present',
    description: 'A customer enters card details at an online checkout with no physical card presented.',
    standardName: 'PCI Data Security Standard (PCI DSS) v4.0',
    standardUrl: 'https://www.pcisecuritystandards.org/document_library/',
    stages: [
      {
        id: 'capture',
        name: 'Capture',
        settingLabel: 'Checkout field hosting',
        secureValue: 'Hosted payment page / iframe from a PCI-validated processor',
        insecureValue: 'Card fields coded directly into the merchant’s own page',
        explanation:
          'Card fields rendered on the merchant’s own page put every script on that page in a position to read cardholder data as it’s typed — the exact pattern behind digital-skimming (Magecart-style) attacks. A hosted field or iframe from the processor keeps that data out of the merchant’s page entirely.',
        controlReference: 'PCI DSS Req. 6.4.3 — manage payment page scripts; scope-reduction guidance',
      },
      {
        id: 'transmission',
        name: 'Transmission',
        settingLabel: 'Checkout transport security',
        secureValue: 'TLS 1.2+ enforced end-to-end, no mixed content',
        insecureValue: 'TLS not enforced / mixed HTTP content allowed',
        explanation:
          'A checkout page that tolerates plain HTTP resources or falls back off TLS gives an on-path attacker (open Wi-Fi, compromised router) a way to intercept or tamper with card data in transit.',
        controlReference: 'PCI DSS Req. 4.2 — strong cryptography for transmission over open, public networks',
      },
      {
        id: 'tokenize',
        name: 'Card-on-File Storage',
        settingLabel: 'Recurring-billing data handling',
        secureValue: 'Card-on-file stored as a network/gateway token',
        insecureValue: 'Raw PAN stored for recurring billing',
        explanation:
          'Recurring billing does not require holding the real PAN — a network token can be charged the same way and revoked or updated by the card network without the merchant ever re-collecting card data.',
        controlReference: 'PCI DSS Req. 3 — protect stored account data',
      },
      {
        id: 'step-up-auth',
        name: 'Step-Up Authentication',
        settingLabel: 'Cardholder authentication',
        secureValue: '3-D Secure (3DS2) challenge on risk-flagged transactions',
        insecureValue: 'No 3-D Secure / cardholder authentication',
        explanation:
          'Card-not-present fraud is the fastest-growing fraud category precisely because there’s no chip or signature to check. A 3DS2 challenge on risky transactions authenticates the cardholder and shifts fraud liability away from the merchant.',
        controlReference: 'EMV 3-D Secure specification; PCI DSS Req. 8 — authenticate access',
      },
      {
        id: 'input-validation',
        name: 'Input Validation & Script Control',
        settingLabel: 'Checkout page script policy',
        secureValue: 'Server-side validation + a Content Security Policy restricting scripts',
        insecureValue: 'Checkout page loads unvetted third-party scripts with no restriction',
        explanation:
          'Unrestricted third-party scripts on a checkout page are the entry point for digital-skimming malware — a compromised ad tag or analytics library can silently exfiltrate card data typed on the same page. A CSP limits what scripts are even allowed to run there.',
        controlReference: 'PCI DSS Req. 6.4.3 and 11.6.1 — payment-page script and change-detection mechanisms',
      },
      {
        id: 'monitoring',
        name: 'Fraud Monitoring',
        settingLabel: 'Transaction anomaly detection',
        secureValue: 'Fraud/anomaly monitoring on transaction volume and velocity',
        insecureValue: 'No fraud monitoring',
        explanation:
          'Without velocity and anomaly monitoring, a stolen card list gets tested and drained against the store before anyone notices the pattern of small, rapid-fire charges from a new list of cards.',
        controlReference: 'PCI DSS Req. 10 — log and monitor; card-network fraud-management program requirements',
      },
    ],
  },
  {
    id: 'ach',
    name: 'ACH / Bank Transfer',
    shortName: 'ACH Transfer',
    description: 'Funds move directly between bank accounts through the Automated Clearing House network.',
    standardName: 'NACHA Operating Rules',
    standardUrl: 'https://www.nacha.org/rules',
    stages: [
      {
        id: 'account-verification',
        name: 'Account Verification',
        settingLabel: 'Bank-account ownership check',
        secureValue: 'Instant verification (micro-deposits or bank-login token)',
        insecureValue: 'Routing and account number keyed in with no verification',
        explanation:
          'Accepting a typed routing and account number with no ownership check lets someone initiate a transfer against an account they don’t control. Instant verification confirms the requester actually has access to that account before it’s ever used.',
        controlReference: 'NACHA Operating Rules — Account Validation requirement (WEB debits)',
      },
      {
        id: 'data-at-rest',
        name: 'Data at Rest',
        settingLabel: 'Stored bank-account data',
        secureValue: 'Bank account and routing numbers encrypted/tokenized at rest',
        insecureValue: 'Bank account numbers stored in cleartext',
        explanation:
          'A bank account and routing number is enough to originate fraudulent ACH debits against that account. Cleartext storage turns a single database exposure into a direct path to account takeover for every customer in it.',
        controlReference: 'GLBA Safeguards Rule; NACHA Operating Rules — Data Security requirements',
      },
      {
        id: 'transmission',
        name: 'Transmission',
        settingLabel: 'Transfer-instruction transport',
        secureValue: 'TLS-encrypted API call to the ACH processor',
        insecureValue: 'Unencrypted batch file transfer',
        explanation:
          'Batch files sent without encryption can be intercepted or altered in transit, changing destination account numbers before the file ever reaches the bank — a documented ACH-fraud technique against unencrypted file-transfer processes.',
        controlReference: 'NACHA Operating Rules — Data Security requirements',
      },
      {
        id: 'authorization',
        name: 'Authorization Record',
        settingLabel: 'Transfer-authorization handling',
        secureValue: 'Signed NACHA authorization retained for each transfer',
        insecureValue: 'No authorization record retained',
        explanation:
          'NACHA rules require an originator to retain proof the account holder authorized the debit. Without that record, a disputed transfer has no defense and the originator absorbs the reversal and any associated penalty.',
        controlReference: 'NACHA Operating Rules — Article 2, Authorization requirements',
      },
      {
        id: 'access-control',
        name: 'Access Control',
        settingLabel: 'Outbound-transfer approval',
        secureValue: 'Dual control: one user initiates, a second approves',
        insecureValue: 'A single user can initiate and approve transfers',
        explanation:
          'A single point of control over outbound transfers is exactly what business-email-compromise fraud targets — one phished or coerced employee, one fraudulent wire. Dual control requires a second, independent approval before funds move.',
        controlReference: 'Segregation-of-duties control; FFIEC guidance on wire/ACH fraud prevention',
      },
      {
        id: 'monitoring',
        name: 'Anomaly Detection',
        settingLabel: 'Transfer monitoring',
        secureValue: 'Real-time anomaly detection on amounts and destinations',
        insecureValue: 'No anomaly detection',
        explanation:
          'Real-time monitoring catches the signature of ACH fraud — a sudden new destination account, an amount far outside historical norms — early enough to hold the transfer before settlement instead of chasing a reversal after the fact.',
        controlReference: 'FFIEC guidance on wire/ACH fraud prevention',
      },
    ],
  },
];
