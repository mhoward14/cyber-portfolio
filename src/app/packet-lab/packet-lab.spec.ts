import { TestBed } from '@angular/core/testing';
import { compileFilter } from './display-filter';
import { HUNTS } from './packet-lab-scenarios';
import { Packet, buildPackets, encodeApp } from './packet-model';
import { PacketLab, hexRows } from './packet-lab';

function filter(packets: Packet[], text: string) {
  const f = compileFilter(text);
  if (!f.ok) throw new Error(`${text}: ${f.error}`);
  return packets.filter(f.test);
}

function ipChecksumValid(bytes: Uint8Array) {
  let sum = 0;
  for (let i = 14; i < 34; i += 2) sum += (bytes[i] << 8) + bytes[i + 1];
  while (sum > 0xffff) sum = (sum & 0xffff) + (sum >> 16);
  return sum === 0xffff;
}

describe('Packet model', () => {
  const [syn, dns] = buildPackets([
    { time: 1, src: '10.20.1.5', dst: '198.51.100.9', transport: 'tcp', srcPort: 50000, dstPort: 443, flags: 'S' },
    { time: 1.5, src: '10.20.1.5', dst: '10.20.0.53', transport: 'udp', srcPort: 50001, dstPort: 53,
      app: { type: 'dns-query', id: 0x1234, name: 'news.example', qtype: 'A' } },
  ]);

  it('should build Ethernet + IPv4 + TCP frames with correct lengths and a valid IP checksum', () => {
    expect(syn.bytes.length).toBe(54);
    expect(syn.length).toBe(54);
    expect((syn.bytes[16] << 8) | syn.bytes[17]).toBe(40);
    expect(syn.bytes[47]).toBe(0x02);
    expect(ipChecksumValid(syn.bytes)).toBe(true);
    expect(syn.info).toContain('[SYN]');
  });

  it('should encode DNS names on the wire and expose them as fields', () => {
    const text = String.fromCharCode(...dns.bytes);
    expect(text).toContain('\u0004news\u0007example\u0000');
    expect(dns.fields.get('dns.qry.name')).toEqual(['news.example']);
    expect(dns.protocol).toBe('DNS');
    expect(ipChecksumValid(dns.bytes)).toBe(true);
    expect(dns.time).toBeCloseTo(0.5);
  });

  it('should carry the SNI in cleartext inside a TLS Client Hello', () => {
    const bytes = encodeApp({ type: 'tls-client-hello', sni: 'cdn.example' }).bytes;
    expect(bytes[0]).toBe(0x16);
    expect(String.fromCharCode(...bytes)).toContain('cdn.example');
  });

  it('should give every layer field a byte range inside the frame', () => {
    for (const layer of syn.layers) {
      for (const f of layer.fields) {
        if (f.range) {
          expect(f.range[0]).toBeGreaterThanOrEqual(0);
          expect(f.range[1]).toBeLessThanOrEqual(syn.length);
        }
      }
    }
  });
});

describe('Display filter', () => {
  const packets = buildPackets([
    { time: 0, src: '10.20.1.5', dst: '198.51.100.9', transport: 'tcp', srcPort: 50000, dstPort: 443, flags: 'S' },
    { time: 0.1, src: '198.51.100.9', dst: '10.20.1.5', transport: 'tcp', srcPort: 443, dstPort: 50000, flags: 'SA', ack: 1 },
    { time: 0.2, src: '10.20.1.5', dst: '10.20.0.53', transport: 'udp', srcPort: 50001, dstPort: 53,
      app: { type: 'dns-query', id: 1, name: 'mail.corp.example', qtype: 'A' } },
  ]);

  it('should treat an empty filter as matching everything', () => {
    expect(filter(packets, '  ').length).toBe(3);
  });

  it('should test protocol and field presence', () => {
    expect(filter(packets, 'dns').length).toBe(1);
    expect(filter(packets, 'tcp').length).toBe(2);
    expect(filter(packets, '!tcp').length).toBe(1);
  });

  it('should match multi-valued fields in either direction, and != only when no value matches', () => {
    expect(filter(packets, 'ip.addr == 198.51.100.9').length).toBe(2);
    expect(filter(packets, 'ip.addr != 198.51.100.9').length).toBe(1);
    expect(filter(packets, 'tcp.port == 443').length).toBe(2);
  });

  it('should support CIDR, boolean logic, word operators, and parentheses', () => {
    expect(filter(packets, 'ip.dst == 10.0.0.0/8').length).toBe(2);
    expect(filter(packets, 'tcp.flags.syn == 1 && tcp.flags.ack == 0').length).toBe(1);
    expect(filter(packets, 'tcp.flags.syn eq 1 and not tcp.flags.ack eq 1').length).toBe(1);
    expect(filter(packets, '(dns || tcp.flags.ack == 1) && ip.src == 10.20.1.5').length).toBe(1);
    expect(filter(packets, 'frame.len > 60').length).toBe(1);
    expect(filter(packets, 'tcp.flags == 0x12').length).toBe(1);
  });

  it('should support contains on text fields', () => {
    expect(filter(packets, 'dns.qry.name contains "corp.example"').length).toBe(1);
    expect(filter(packets, 'dns.qry.name contains "nope"').length).toBe(0);
  });

  it('should reject malformed filters with a readable error', () => {
    const cases = ['ip.adr == 1.2.3.4', 'ip.src = 10.0.0.1', 'ip.src == 10.0.0', 'tcp.port == http', '(dns', 'dns)', 'dns &&', 'tcp.port contains "4"', 'dns == 1'];
    for (const c of cases) {
      const r = compileFilter(c);
      expect(r.ok, c).toBe(false);
      if (!r.ok) expect(r.error.length, c).toBeGreaterThan(10);
    }
  });
});

describe('Hunts', () => {
  for (const hunt of HUNTS) {
    describe(hunt.name, () => {
      const packets = hunt.build();

      it('should build the same capture every time', () => {
        const again = hunt.build();
        expect(again.length).toBe(packets.length);
        expect(again.map((p) => p.info)).toEqual(packets.map((p) => p.info));
      });

      it('should produce valid frames', () => {
        for (const p of packets) {
          expect(p.bytes.length).toBe(p.length);
          expect(ipChecksumValid(p.bytes), `frame ${p.no}`).toBe(true);
        }
      });

      it('should have exactly one correct option per question', () => {
        for (const q of hunt.questions) expect(q.options.filter((o) => o.correct).length, q.prompt).toBe(1);
      });

      it('should offer only filters that parse and match at least one packet', () => {
        const filters = [hunt.evidenceFilter, ...hunt.suggestedFilters, ...hunt.questions.flatMap((q) => (q.filter ? [q.filter] : []))];
        for (const f of filters) expect(filter(packets, f).length, f).toBeGreaterThan(0);
      });

      it('should keep the evidence to a subset of the capture', () => {
        const evidence = filter(packets, hunt.evidenceFilter);
        expect(evidence.length).toBeLessThan(packets.length);
      });
    });
  }

  const byId = (id: string) => HUNTS.find((h) => h.id === id)!;

  it('beaconing: only the beacon host talks to the C2 address, about every 60 seconds', () => {
    const packets = byId('beaconing').build();
    const hellos = filter(packets, 'ip.dst == 203.0.113.47 && tls.handshake.type == 1');
    expect(hellos.length).toBe(10);
    expect(new Set(hellos.map((p) => p.src))).toEqual(new Set(['10.20.4.17']));
    for (let i = 1; i < hellos.length; i++) {
      expect(Math.abs(hellos[i].time - hellos[i - 1].time - 60)).toBeLessThan(1);
    }
    expect(filter(packets, 'tls.handshake.extensions_server_name == "cdn-update-sync.example"').length).toBe(10);
  });

  it('port scan: SYN-ACKs from the target reveal exactly 22, 443, and 3389, and the scanner never completes a handshake', () => {
    const packets = byId('port-scan').build();
    const probes = filter(packets, 'ip.src == 10.20.9.50 && tcp.flags.syn == 1 && tcp.flags.ack == 0');
    expect(probes.length).toBe(24);
    const open = filter(packets, 'ip.src == 10.20.1.10 && ip.dst == 10.20.9.50 && tcp.flags.syn == 1 && tcp.flags.ack == 1');
    expect(open.map((p) => p.fields.get('tcp.srcport')![0]).sort((a, b) => Number(a) - Number(b))).toEqual([22, 443, 3389]);
    expect(filter(packets, 'ip.src == 10.20.9.50 && tcp.flags.ack == 1').length).toBe(0);
    const synAckAll = filter(packets, 'tcp.flags.syn == 1');
    expect(synAckAll.length).toBeGreaterThan(probes.length);
  });

  it('DNS tunnel: the domain filter isolates the tunnel, while the TXT filter also catches the SPF lookup', () => {
    const packets = byId('dns-tunnel').build();
    const tunnel = filter(packets, 'dns.qry.name contains "syncdata.example"');
    const txt = filter(packets, 'dns.qry.type == 16');
    expect(tunnel.length).toBe(56);
    expect(new Set(filter(packets, 'dns.qry.name contains "syncdata.example" && dns.flags.response == 0').map((p) => p.src))).toEqual(
      new Set(['10.20.6.33']),
    );
    expect(txt.length).toBe(tunnel.length + 2);
  });

  it('cleartext credentials: the PASS command and the HTTP POST body are readable in the bytes', () => {
    const packets = byId('cleartext-creds').build();
    const [pass] = filter(packets, 'ftp.request.command == "PASS"');
    expect(String.fromCharCode(...pass.bytes)).toContain('PASS Harbor!2026');
    const argField = pass.layers.at(-1)!.fields.find((f) => f.label.startsWith('Request arg'))!;
    expect(String.fromCharCode(...pass.bytes.slice(...argField.range!))).toBe('Harbor!2026');
    const [user] = filter(packets, 'ftp.request.command == "USER"');
    expect(user.fields.get('ftp.request.arg')).toEqual(['jdoe']);
    const [post] = filter(packets, 'http.request.method == "POST"');
    expect(String.fromCharCode(...post.bytes)).toContain('username=asmith');
    expect(filter(packets, 'tls.handshake.extensions_server_name == "sso.corp.example"').length).toBe(1);
  });
});

describe('PacketLab component', () => {
  it('should split bytes into 16-byte hex rows', () => {
    const rows = hexRows(Uint8Array.from({ length: 20 }, (_, i) => 0x41 + i));
    expect(rows.length).toBe(2);
    expect(rows[0].offset).toBe('0000');
    expect(rows[1].offset).toBe('0010');
    expect(rows[0].cells[0]).toEqual({ hex: '41', ascii: 'A', index: 0 });
  });

  it('should run a hunt: filter, select, answer, and complete', () => {
    const lab = TestBed.runInInjectionContext(() => new PacketLab());
    lab.start('cleartext-creds');
    expect(lab.packets().length).toBeGreaterThan(0);
    expect(lab.selectedNo()).toBe(1);

    lab.onFilterInput('ftp.request.command ==');
    expect(lab.filterCheck().ok).toBe(false);
    lab.applyFilter();
    expect(lab.appliedFilter()).toBe('');

    lab.applyFilter('ftp.request.command == "PASS"');
    expect(lab.displayed().length).toBe(1);
    expect(lab.selectedNo()).toBe(lab.displayed()[0].no);

    const hunt = lab.hunt()!;
    hunt.questions.forEach((q, i) => lab.answer(i, q.options.findIndex((o) => o.correct)));
    lab.answer(0, 1);
    expect(lab.answers()[0]).toBe(hunt.questions[0].options.findIndex((o) => o.correct));
    expect(lab.complete()).toBe(true);
    expect(lab.score()).toBe(hunt.questions.length);

    lab.restart();
    expect(lab.answeredCount()).toBe(0);
    expect(lab.appliedFilter()).toBe('');
  });
});

describe('Hunt answer order', () => {
  it('should not always put the correct answer in the same position', () => {
    const positions = HUNTS.flatMap((h) => h.questions.map((q) => q.options.findIndex((o) => o.correct)));
    expect(new Set(positions).size).toBe(4);
    for (let i = 0; i < 4; i++) expect(positions.filter((p) => p === i).length).toBeLessThanOrEqual(8);
  });
});
