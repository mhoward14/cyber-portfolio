/* ============================================================
   PACKET-LAB-SCENARIOS.TS — PACKET ANALYSIS LAB
   Four threat hunts, each a seeded synthetic capture plus the
   questions an analyst would answer from it. Captures are generated
   from a fixed seed, so every visitor sees identical packets and the
   answer key always holds (packet-lab.spec.ts checks each one).
   ============================================================ */

import { AppPayload, Packet, PacketSpec, TcpConversation, buildPackets, rng } from './packet-model';

export type HuntId = 'beaconing' | 'port-scan' | 'dns-tunnel' | 'cleartext-creds';

export interface HuntOption {
  text: string;
  correct?: boolean;
}

export interface HuntQuestion {
  prompt: string;
  options: HuntOption[];
  /** Shown once the question is answered, right or wrong. */
  explanation: string;
  /** A filter the visitor can apply from the explanation. */
  filter?: string;
}

export interface Hunt {
  id: HuntId;
  name: string;
  teaser: string;
  briefing: string;
  technique: { id: string; name: string };
  /** Filter that isolates the malicious or exposed traffic. */
  evidenceFilter: string;
  /** Filters offered as one-click chips in the filter bar. */
  suggestedFilters: string[];
  questions: HuntQuestion[];
  /** Indicators the hunt establishes, written to the Engagement Report. */
  findings: { kind: string; value: string; detail: string }[];
  /** Attack Path techniques this hunt's traffic usually accompanies, and why;
   *  used to recommend the hunt for an engagement's attack chain. */
  relatedTo: { attackIds: string[]; reason: string };
  build: () => Packet[];
}

const DNS_SERVER = '10.20.0.53';

/** Benign destinations the background hosts browse. */
const SITES: { name: string; ip: string }[] = [
  { name: 'mail.corp.example', ip: '198.51.100.20' },
  { name: 'docs.vendor.example', ip: '198.51.100.34' },
  { name: 'updates.os-vendor.example', ip: '198.51.100.61' },
  { name: 'news.example', ip: '198.51.100.88' },
  { name: 'crm.saas.example', ip: '198.51.100.112' },
  { name: 'video.meet.example', ip: '198.51.100.140' },
];

class CaptureBuilder {
  readonly specs: PacketSpec[] = [];
  private dnsId: number;
  private port: number;

  constructor(readonly r: () => number) {
    this.dnsId = 0x1a00 + Math.floor(r() * 0x4000);
    this.port = 49200 + Math.floor(r() * 4000);
  }

  ephemeral() {
    this.port += 1 + Math.floor(this.r() * 7);
    return this.port;
  }

  dns(t: number, client: string, name: string, qtype: 'A' | 'TXT', answer: string) {
    const id = this.dnsId++ & 0xffff;
    const port = this.ephemeral();
    const q: AppPayload = { type: 'dns-query', id, name, qtype };
    const a: AppPayload = { type: 'dns-response', id, name, qtype, answer };
    this.specs.push({ time: t, src: client, dst: DNS_SERVER, transport: 'udp', srcPort: port, dstPort: 53, app: q });
    this.specs.push({ time: t + 0.004 + this.r() * 0.01, src: DNS_SERVER, dst: client, transport: 'udp', srcPort: 53, dstPort: port, app: a });
  }

  /** A complete HTTPS session: handshake, Client Hello, a request/response, close. */
  https(t: number, client: string, server: string, sni: string, up = 420, down = 1180) {
    const c = new TcpConversation(this.specs, client, server, this.ephemeral(), 443);
    const rtt = 0.012 + this.r() * 0.03;
    c.handshake(t, rtt);
    c.client_(t + rtt + 0.001, { type: 'tls-client-hello', sni });
    c.server_(t + 2 * rtt + 0.002, { type: 'tls-server-hello', seed: Math.floor(this.r() * 2 ** 31) });
    c.client_(t + 2 * rtt + 0.004, { type: 'tls-app-data', length: up });
    c.server_(t + 3 * rtt + 0.01, { type: 'tls-app-data', length: down });
    c.close(t + 3 * rtt + 0.2 + this.r() * 0.5);
  }

  /** Background browsing: look a site up, then visit it over HTTPS. */
  browse(t: number, client: string) {
    const site = SITES[Math.floor(this.r() * SITES.length)];
    this.dns(t, client, site.name, 'A', site.ip);
    this.https(t + 0.03, client, site.ip, site.name, 300 + Math.floor(this.r() * 400), 600 + Math.floor(this.r() * 1000));
  }

  noise(clients: string[], start: number, end: number, count: number) {
    for (let i = 0; i < count; i++) {
      const t = start + this.r() * (end - start);
      this.browse(t, clients[Math.floor(this.r() * clients.length)]);
    }
  }

  packets() {
    return buildPackets(this.specs);
  }
}

// ---------- hunt 1: C2 beaconing ----------

const BEACON_HOST = '10.20.4.17';
const C2_IP = '203.0.113.47';
const C2_NAME = 'cdn-update-sync.example';

function buildBeaconing(): Packet[] {
  const cap = new CaptureBuilder(rng(0x5eed01));
  const start = 1000;
  cap.dns(start + 2.1, BEACON_HOST, C2_NAME, 'A', C2_IP);
  for (let i = 0; i < 10; i++) {
    const t = start + 2.2 + i * 60 + (cap.r() - 0.5) * 0.8;
    cap.https(t, BEACON_HOST, C2_IP, C2_NAME, 184, 64);
  }
  cap.noise(['10.20.4.21', '10.20.4.35', BEACON_HOST], start, start + 600, 14);
  return cap.packets();
}

// ---------- hunt 2: SYN port scan ----------

const SCANNER = '10.20.9.50';
const SCAN_TARGET = '10.20.1.10';
const SCANNED_PORTS = [21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 587, 993, 995, 1433, 1723, 3306, 3389, 5900, 5985, 8080, 8443];
const OPEN_PORTS = [22, 443, 3389];

function buildPortScan(): Packet[] {
  const r = rng(0x5eed02);
  const cap = new CaptureBuilder(r);
  const start = 2000;
  cap.noise(['10.20.4.21', '10.20.4.35'], start, start + 40, 4);
  // A legitimate user reaching the same server, for contrast: a full handshake.
  cap.https(start + 6.5, '10.20.4.21', SCAN_TARGET, 'files.corp.example', 380, 2400);

  const order = [...SCANNED_PORTS];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const srcPort = 58311;
  let t = start + 12;
  for (const port of order) {
    t += 0.004 + r() * 0.012;
    const seq = Math.floor(r() * 2 ** 31);
    cap.specs.push({ time: t, src: SCANNER, dst: SCAN_TARGET, transport: 'tcp', srcPort, dstPort: port, flags: 'S', seq });
    const reply = t + 0.0008 + r() * 0.002;
    if (OPEN_PORTS.includes(port)) {
      cap.specs.push({ time: reply, src: SCAN_TARGET, dst: SCANNER, transport: 'tcp', srcPort: port, dstPort: srcPort, flags: 'SA', seq: Math.floor(r() * 2 ** 31), ack: seq + 1 });
      // Half-open: the scanner tears the connection down instead of finishing it.
      cap.specs.push({ time: reply + 0.0003, src: SCANNER, dst: SCAN_TARGET, transport: 'tcp', srcPort, dstPort: port, flags: 'R', seq: seq + 1 });
    } else {
      cap.specs.push({ time: reply, src: SCAN_TARGET, dst: SCANNER, transport: 'tcp', srcPort: port, dstPort: srcPort, flags: 'RA', seq: 0, ack: seq + 1 });
    }
  }
  cap.noise(['10.20.4.21', '10.20.4.35'], t + 1, t + 30, 3);
  return cap.packets();
}

// ---------- hunt 3: DNS tunneling ----------

const TUNNEL_HOST = '10.20.6.33';
const TUNNEL_DOMAIN = 'syncdata.example';
const MAIL_SERVER = '10.20.1.25';

function randomLabel(r: () => number, n: number, alphabet: string) {
  let s = '';
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(r() * alphabet.length)];
  return s;
}

function buildDnsTunnel(): Packet[] {
  const r = rng(0x5eed03);
  const cap = new CaptureBuilder(r);
  const start = 3000;
  const base32 = 'abcdefghijklmnopqrstuvwxyz234567';
  const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let t = start + 3;
  for (let i = 0; i < 28; i++) {
    t += 2.5 + r() * 1.5;
    const label = randomLabel(r, 44 + Math.floor(r() * 12), base32);
    cap.dns(t, TUNNEL_HOST, `${label}.t.${TUNNEL_DOMAIN}`, 'TXT', randomLabel(r, 24 + Math.floor(r() * 16), base64) + '=');
  }
  // A mail server's routine SPF lookup: a legitimate TXT query.
  cap.dns(start + 37.4, MAIL_SERVER, 'corp.example', 'TXT', 'v=spf1 ip4:198.51.100.20 -all');
  cap.noise(['10.20.6.12', '10.20.6.40', TUNNEL_HOST], start, t, 10);
  return cap.packets();
}

// ---------- hunt 4: cleartext credentials ----------

const FTP_CLIENT = '10.20.3.44';
const FTP_SERVER = '10.20.1.30';
const WEB_CLIENT = '10.20.3.51';
const INTRANET = '10.20.1.80';

function buildCleartextCreds(): Packet[] {
  const r = rng(0x5eed04);
  const cap = new CaptureBuilder(r);
  const start = 4000;

  const ftp = new TcpConversation(cap.specs, FTP_CLIENT, FTP_SERVER, 50122, 21);
  ftp.handshake(start + 4, 0.002);
  ftp
    .server_(start + 4.01, { type: 'ftp-response', code: 220, text: 'FileStore FTP server ready' })
    .client_(start + 5.3, { type: 'ftp-request', command: 'USER', arg: 'jdoe' })
    .server_(start + 5.31, { type: 'ftp-response', code: 331, text: 'Password required for jdoe' })
    .client_(start + 7.9, { type: 'ftp-request', command: 'PASS', arg: 'Harbor!2026' })
    .server_(start + 7.95, { type: 'ftp-response', code: 230, text: 'User jdoe logged in' })
    .client_(start + 8.4, { type: 'ftp-request', command: 'PWD', arg: '' })
    .server_(start + 8.41, { type: 'ftp-response', code: 257, text: '"/home/jdoe" is the current directory' })
    .client_(start + 12.2, { type: 'ftp-request', command: 'QUIT', arg: '' })
    .server_(start + 12.21, { type: 'ftp-response', code: 221, text: 'Goodbye' })
    .close(start + 12.22);

  cap.dns(start + 15.1, WEB_CLIENT, 'intranet.corp.example', 'A', INTRANET);
  const web = new TcpConversation(cap.specs, WEB_CLIENT, INTRANET, cap.ephemeral(), 80);
  web.handshake(start + 15.12, 0.002);
  web
    .client_(start + 15.13, { type: 'http-request', method: 'GET', host: 'intranet.corp.example', uri: '/login' })
    .server_(start + 15.15, { type: 'http-response', status: 200, reason: 'OK', body: '<form method="post">' })
    .client_(start + 21.6, {
      type: 'http-request',
      method: 'POST',
      host: 'intranet.corp.example',
      uri: '/login',
      body: 'username=asmith&password=Ledger%2477',
    })
    .server_(start + 21.64, { type: 'http-response', status: 302, reason: 'Found' })
    .close(start + 22.1);

  // The same kind of login done right: over TLS, nothing readable.
  cap.dns(start + 26.0, '10.20.3.60', 'sso.corp.example', 'A', '10.20.1.90');
  cap.https(start + 26.03, '10.20.3.60', '10.20.1.90', 'sso.corp.example', 610, 1400);
  cap.noise(['10.20.3.60', '10.20.3.72', WEB_CLIENT], start, start + 40, 6);
  return cap.packets();
}

// ---------- hunts ----------

const HUNT_LIST: Hunt[] = [
  {
    id: 'beaconing',
    name: 'Command-and-Control Beaconing',
    teaser: 'A workstation is calling home on a schedule. Find it, its cadence, and where it is calling.',
    briefing:
      'Threat intelligence reports malware that checks in with its controller over HTTPS at fixed intervals. ' +
      'This is a 10-minute capture from the 10.20.4.0/24 user segment. Most of it is ordinary browsing.',
    technique: { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols' },
    evidenceFilter: `ip.addr == ${C2_IP}`,
    suggestedFilters: ['tls.handshake.type == 1', 'dns', `ip.addr == ${C2_IP}`, 'tcp.flags.syn == 1 && tcp.flags.ack == 0'],
    questions: [
      {
        prompt: 'Which internal host is beaconing?',
        options: [{ text: BEACON_HOST, correct: true }, { text: '10.20.4.21' }, { text: '10.20.4.35' }, { text: DNS_SERVER }],
        explanation:
          `Filter on Client Hellos and read the Destination column: ${BEACON_HOST} opens a new TLS session to ${C2_IP} again and again, ` +
          'while the other hosts visit a mix of sites at irregular times. Every host browses; only one keeps a schedule.',
        filter: 'tls.handshake.type == 1',
      },
      {
        prompt: 'What server name (SNI) does the beacon present in its TLS Client Hello?',
        options: [{ text: C2_NAME, correct: true }, { text: 'updates.os-vendor.example' }, { text: 'crm.saas.example' }, { text: 'None. The name is encrypted.' }],
        explanation:
          'Select any Client Hello to that host and expand Transport Layer Security. The Server Name Indication extension travels ' +
          'in cleartext before encryption starts, so it is visible even though the payload is not. A name that imitates a CDN or ' +
          'update service is a common way to blend in.',
        filter: `tls.handshake.extensions_server_name == "${C2_NAME}"`,
      },
      {
        prompt: 'About how often does it check in?',
        options: [{ text: 'Every 5 seconds' }, { text: 'Every 60 seconds', correct: true }, { text: 'Every 5 minutes' }, { text: 'At random intervals' }],
        explanation:
          'Compare the Time column of consecutive Client Hellos to the C2 address: about 60 seconds apart, with under a second of ' +
          'jitter. Human browsing is bursty; machine check-ins are regular. That regularity is the signal.',
        filter: `ip.dst == ${C2_IP} && tls.handshake.type == 1`,
      },
      {
        prompt: 'Which filter shows all of the C2 traffic in both directions?',
        options: [
          { text: `ip.addr == ${C2_IP}`, correct: true },
          { text: `ip.src == ${C2_IP}` },
          { text: 'tcp.port == 443' },
          { text: 'dns' },
        ],
        explanation:
          'ip.addr matches a packet when either the source or the destination equals the address. ip.src alone drops everything the ' +
          'infected host sent; tcp.port == 443 also catches all the legitimate HTTPS; dns shows only the name lookups.',
        filter: `ip.addr == ${C2_IP}`,
      },
      {
        prompt: 'Which MITRE ATT&CK technique best describes this activity?',
        options: [
          { text: 'T1071.001 Application Layer Protocol: Web Protocols', correct: true },
          { text: 'T1046 Network Service Discovery' },
          { text: 'T1048 Exfiltration Over Alternative Protocol' },
          { text: 'T1110 Brute Force' },
        ],
        explanation:
          'The malware hides its command channel inside ordinary HTTPS on port 443, which is T1071.001. The small, fixed-size ' +
          'check-ins carry commands rather than bulk data, so this is command and control, not exfiltration.',
      },
    ],
    findings: [
      { kind: 'Host', value: BEACON_HOST, detail: `Opened a new TLS session to ${C2_IP} every 60 seconds, with under a second of jitter, for the full 10-minute capture.` },
      { kind: 'C2 server', value: `${C2_IP} (${C2_NAME})`, detail: 'Server name imitates an update CDN. Check-ins are small and fixed-size (184 bytes up, 64 down).' },
    ],
    relatedTo: { attackIds: ['T1059.001', 'T1204', 'T1566'], reason: 'Code that runs on a host usually opens a command-and-control channel next.' },
    build: buildBeaconing,
  },
  {
    id: 'port-scan',
    name: 'Internal Port Scan',
    teaser: 'Something is knocking on every door of a file server. Identify the scanner and what it found.',
    briefing:
      `The file server ${SCAN_TARGET} logged a burst of connection attempts. This capture comes from the server's switch port. ` +
      'Work out who scanned it, how, and what the scanner learned.',
    technique: { id: 'T1046', name: 'Network Service Discovery' },
    evidenceFilter: `ip.addr == ${SCANNER}`,
    suggestedFilters: ['tcp.flags.syn == 1 && tcp.flags.ack == 0', 'tcp.flags.reset == 1', `ip.src == ${SCAN_TARGET} && tcp.flags.syn == 1`, 'tls'],
    questions: [
      {
        prompt: 'Which host ran the scan?',
        options: [{ text: SCANNER, correct: true }, { text: SCAN_TARGET }, { text: '10.20.4.21' }, { text: DNS_SERVER }],
        explanation:
          `${SCANNER} sends 24 SYNs to 24 different ports on ${SCAN_TARGET} in about a quarter of a second, all from one source port. ` +
          `10.20.4.21 also connects to the server, but once, to port 443, and it completes the session.`,
        filter: 'tcp.flags.syn == 1 && tcp.flags.ack == 0',
      },
      {
        prompt: 'Which filter lists only the connection attempts, and not the replies?',
        options: [
          { text: 'tcp.flags.syn == 1 && tcp.flags.ack == 0', correct: true },
          { text: 'tcp.flags.syn == 1' },
          { text: 'tcp.flags.reset == 1' },
          { text: 'tcp.port == 22' },
        ],
        explanation:
          'A connection attempt sets SYN without ACK. The server\'s SYN-ACK replies also have SYN set, so tcp.flags.syn == 1 on its ' +
          'own mixes probes and answers. RST shows how ports answered, not what was probed.',
        filter: 'tcp.flags.syn == 1 && tcp.flags.ack == 0',
      },
      {
        prompt: `Which ports are open on ${SCAN_TARGET}?`,
        options: [
          { text: '22, 443, and 3389', correct: true },
          { text: '21, 23, and 80' },
          { text: 'All 24 ports that were probed' },
          { text: 'None. Every probe was reset.' },
        ],
        explanation:
          'An open port answers a SYN with SYN-ACK; a closed port answers with RST-ACK. Filter on SYN-ACKs sent by the server and ' +
          'read the source ports: SSH (22), HTTPS (443), and RDP (3389). Those are the services an attacker would try next.',
        filter: `ip.src == ${SCAN_TARGET} && tcp.flags.syn == 1 && tcp.flags.ack == 1`,
      },
      {
        prompt: 'What kind of scan is this?',
        options: [
          { text: 'A TCP SYN ("half-open") scan', correct: true },
          { text: 'A full TCP connect scan' },
          { text: 'A UDP scan' },
          { text: 'An ICMP ping sweep' },
        ],
        explanation:
          'When a port answers SYN-ACK, the scanner sends RST instead of the final ACK, so no connection is ever completed. That ' +
          'is the half-open pattern of a SYN scan (nmap -sS). A connect scan would finish the three-way handshake first.',
        filter: `ip.src == ${SCANNER} && tcp.flags.reset == 1`,
      },
      {
        prompt: 'Which MITRE ATT&CK technique fits a scan from inside the network?',
        options: [
          { text: 'T1046 Network Service Discovery', correct: true },
          { text: 'T1595 Active Scanning' },
          { text: 'T1021 Remote Services' },
          { text: 'T1071 Application Layer Protocol' },
        ],
        explanation:
          'T1595 Active Scanning covers reconnaissance of a target before the attacker is inside. A scan from a host on the internal ' +
          'network means someone already has a foothold and is mapping services to move laterally, which is T1046.',
      },
    ],
    findings: [
      { kind: 'Scanner', value: SCANNER, detail: `Sent SYNs to 24 ports on ${SCAN_TARGET} in about a quarter of a second from one source port, resetting every SYN-ACK (half-open SYN scan).` },
      { kind: 'Exposed services', value: `${SCAN_TARGET}: 22, 443, 3389`, detail: 'Ports that answered the scan: SSH, HTTPS, and RDP. The likely next targets for lateral movement.' },
    ],
    relatedTo: { attackIds: ['T1021.004', 'T1570', 'T1550'], reason: 'Lateral movement usually starts with discovering which services are reachable.' },
    build: buildPortScan,
  },
  {
    id: 'dns-tunnel',
    name: 'DNS Tunneling',
    teaser: 'DNS traffic from one workstation looks strange. Find the data hiding in the lookups.',
    briefing:
      'The DNS resolver flagged one client for an unusual volume of queries. Firewalls usually let DNS through, which makes it ' +
      'a favorite covert channel. This is a 90-second capture from the 10.20.6.0/24 segment.',
    technique: { id: 'T1071.004', name: 'Application Layer Protocol: DNS' },
    evidenceFilter: `dns.qry.name contains "${TUNNEL_DOMAIN}"`,
    suggestedFilters: ['dns', 'dns.qry.type == 16', 'dns.flags.response == 0', `dns.qry.name contains "${TUNNEL_DOMAIN}"`],
    questions: [
      {
        prompt: 'Which domain is carrying the tunnel?',
        options: [{ text: TUNNEL_DOMAIN, correct: true }, { text: 'corp.example' }, { text: 'docs.vendor.example' }, { text: 'news.example' }],
        explanation:
          `Filter on dns and read the query names. Dozens of lookups end in t.${TUNNEL_DOMAIN}, each with a different long label in ` +
          'front. The attacker runs the authoritative server for that domain, so every query delivers data to them.',
        filter: 'dns.flags.response == 0',
      },
      {
        prompt: 'Which host is sending the tunneled queries?',
        options: [{ text: TUNNEL_HOST, correct: true }, { text: DNS_SERVER }, { text: MAIL_SERVER }, { text: '10.20.6.12' }],
        explanation:
          `The queries come from ${TUNNEL_HOST}. ${DNS_SERVER} is the internal resolver: it answers every client, so it appears ` +
          'in all DNS traffic but originates none of it.',
        filter: `dns.qry.name contains "${TUNNEL_DOMAIN}"`,
      },
      {
        prompt: 'What is the strongest indicator of tunneling here?',
        options: [
          { text: 'Many TXT queries with long, random-looking labels under one domain', correct: true },
          { text: 'DNS is using UDP port 53' },
          { text: 'The answers come from an internal resolver' },
          { text: 'Some queries ask for A records' },
        ],
        explanation:
          'Legitimate names are short and readable and repeat. Here each label is 44 or more characters of base32 that never ' +
          'repeats, and the TXT answers hold base64. Encoded data in both directions, at a steady rate, is the fingerprint.',
      },
      {
        prompt: 'Which filter shows the tunnel traffic and nothing else?',
        options: [
          { text: `dns.qry.name contains "${TUNNEL_DOMAIN}"`, correct: true },
          { text: 'dns.qry.type == 16' },
          { text: 'udp.port == 53' },
          { text: 'dns.flags.response == 1' },
        ],
        explanation:
          `Only the domain match is exact. dns.qry.type == 16 (TXT) also catches the mail server's routine SPF lookup for ` +
          'corp.example; udp.port == 53 and dns.flags.response == 1 include every normal lookup too.',
        filter: `dns.qry.name contains "${TUNNEL_DOMAIN}"`,
      },
      {
        prompt: 'Which MITRE ATT&CK technique fits?',
        options: [
          { text: 'T1071.004 Application Layer Protocol: DNS', correct: true },
          { text: 'T1568.002 Dynamic Resolution: Domain Generation Algorithms' },
          { text: 'T1046 Network Service Discovery' },
          { text: 'T1040 Network Sniffing' },
        ],
        explanation:
          'The channel rides inside DNS itself, which is T1071.004. It can look like a domain generation algorithm, but a DGA ' +
          `changes the registered domain to find its server; here the domain stays fixed and only the subdomain carries data.`,
      },
    ],
    findings: [
      { kind: 'Host', value: TUNNEL_HOST, detail: 'Sent 28 TXT queries with 44+ character base32 labels over about 90 seconds.' },
      { kind: 'Tunnel domain', value: `t.${TUNNEL_DOMAIN}`, detail: 'Attacker-controlled zone. Query labels carry data out; base64 TXT answers carry data back in.' },
    ],
    relatedTo: { attackIds: [], reason: '' },
    build: buildDnsTunnel,
  },
  {
    id: 'cleartext-creds',
    name: 'Cleartext Credentials',
    teaser: 'Passwords are crossing the wire unencrypted. Find them before someone else does.',
    briefing:
      'An audit asked whether any internal service still accepts logins without encryption. This capture comes from the ' +
      '10.20.3.0/24 segment during the morning logon window. Anyone who can capture this traffic can read what it contains.',
    technique: { id: 'T1040', name: 'Network Sniffing' },
    evidenceFilter: 'ftp || http',
    suggestedFilters: ['ftp', 'http.request.method == "POST"', 'tls.handshake.type == 1', 'ftp.request.command == "PASS"'],
    questions: [
      {
        prompt: 'Which filter goes straight to the FTP password?',
        options: [
          { text: 'ftp.request.command == "PASS"', correct: true },
          { text: 'ftp.response.code == 230' },
          { text: 'tcp.port == 21 && tcp.flags.syn == 1' },
          { text: 'tls' },
        ],
        explanation:
          'FTP sends the password as the argument of a PASS command, in plain text. Code 230 is the server confirming the login, ' +
          'and the SYN is only the connection opening. Select the PASS packet and look at the hex pane: the password is readable.',
        filter: 'ftp.request.command == "PASS"',
      },
      {
        prompt: 'Whose FTP credentials were exposed?',
        options: [{ text: 'jdoe', correct: true }, { text: 'asmith' }, { text: 'anonymous' }, { text: 'admin' }],
        explanation: 'The USER command just before PASS names the account: jdoe. The server even repeats it in its 331 and 230 replies.',
        filter: 'ftp.request.command == "USER" || ftp.request.command == "PASS"',
      },
      {
        prompt: 'Where else did credentials cross the network unencrypted?',
        options: [
          { text: 'An HTTP POST to intranet.corp.example/login', correct: true },
          { text: 'The TLS session to sso.corp.example' },
          { text: 'The DNS lookups' },
          { text: 'Nowhere else' },
        ],
        explanation:
          'The intranet login form posts to port 80, so the body (username=asmith&password=...) is readable. The login to ' +
          'sso.corp.example uses TLS: the capture shows the server name but none of the content.',
        filter: 'http.request.method == "POST"',
      },
      {
        prompt: 'An attacker with a foothold on this segment could collect these passwords with which ATT&CK technique?',
        options: [
          { text: 'T1040 Network Sniffing', correct: true },
          { text: 'T1557 Adversary-in-the-Middle' },
          { text: 'T1110 Brute Force' },
          { text: 'T1552.001 Unsecured Credentials: Credentials In Files' },
        ],
        explanation:
          'Passive capture is enough when the protocol does not encrypt, which is T1040. Adversary-in-the-Middle (T1557) means ' +
          'actively redirecting traffic, which an attacker would only need if the traffic were protected.',
      },
      {
        prompt: 'What fixes the root cause?',
        options: [
          { text: 'Replace FTP with SFTP or FTPS, and serve the login page only over HTTPS', correct: true },
          { text: 'Block port 21 at the internet firewall' },
          { text: 'Require password changes every 90 days' },
          { text: 'Enable DNSSEC on the internal resolver' },
        ],
        explanation:
          'Both services need encryption in transit (NIST SP 800-53 SC-8). This traffic never leaves the building, so a perimeter ' +
          'rule does not help, and rotating a password that is still sent in cleartext only exposes the new one.',
      },
    ],
    findings: [
      { kind: 'Exposed credential', value: `jdoe (FTP, ${FTP_CLIENT} to ${FTP_SERVER})`, detail: 'USER and PASS sent in cleartext on port 21. Password redacted here; reset it and move the service to SFTP or FTPS.' },
      { kind: 'Exposed credential', value: 'asmith (HTTP, intranet.corp.example)', detail: 'Login form posted over port 80 with the password in the body. Serve the form over HTTPS only.' },
    ],
    relatedTo: { attackIds: ['T1078'], reason: 'Valid accounts are often harvested from logins that cross the network unencrypted.' },
    build: buildCleartextCreds,
  },
];

/** Answer options are written correct-first for readability; shuffle them
 *  with a fixed seed so the right answer's position varies but never
 *  changes between visits. */
function shuffleOptions(hunts: Hunt[]): Hunt[] {
  const r = rng(0x0b7105);
  return hunts.map((h) => ({
    ...h,
    questions: h.questions.map((q) => {
      const options = [...q.options];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      return { ...q, options };
    }),
  }));
}

export const HUNTS: Hunt[] = shuffleOptions(HUNT_LIST);
