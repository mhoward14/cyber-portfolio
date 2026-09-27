/* ============================================================
   DISPLAY-FILTER.TS — PACKET ANALYSIS LAB
   A subset of Wireshark's display-filter language, evaluated against
   the fields packet-model.ts records for each frame:

     field                      true when the field is present
     field == value             also != > < >= <= and eq ne gt lt ge le
     field contains "text"
     a && b, a || b, !a         also and / or / not, with parentheses

   Values can be numbers (decimal or 0x hex), IPv4 addresses, CIDR
   blocks (ip.src == 10.20.0.0/16), MAC addresses, or quoted strings.
   Multi-valued fields (ip.addr, tcp.port, eth.addr) follow Wireshark:
   `==` matches when ANY value matches, `!=` when NONE does.
   ============================================================ */

import { FieldValue, Packet } from './packet-model';

type FieldType = 'protocol' | 'number' | 'string' | 'ipv4' | 'mac';

/** Every field the lab's packets can carry, with the value type it holds. */
export const FIELD_TYPES: Record<string, FieldType> = {
  frame: 'protocol',
  eth: 'protocol',
  ip: 'protocol',
  tcp: 'protocol',
  udp: 'protocol',
  dns: 'protocol',
  http: 'protocol',
  tls: 'protocol',
  ftp: 'protocol',
  'frame.number': 'number',
  'frame.len': 'number',
  'frame.time_relative': 'number',
  'frame.protocols': 'string',
  'eth.src': 'mac',
  'eth.dst': 'mac',
  'eth.addr': 'mac',
  'ip.src': 'ipv4',
  'ip.dst': 'ipv4',
  'ip.addr': 'ipv4',
  'ip.ttl': 'number',
  'ip.len': 'number',
  'ip.proto': 'number',
  'tcp.srcport': 'number',
  'tcp.dstport': 'number',
  'tcp.port': 'number',
  'tcp.stream': 'number',
  'tcp.seq': 'number',
  'tcp.ack': 'number',
  'tcp.len': 'number',
  'tcp.flags': 'number',
  'tcp.flags.syn': 'number',
  'tcp.flags.ack': 'number',
  'tcp.flags.fin': 'number',
  'tcp.flags.reset': 'number',
  'tcp.flags.push': 'number',
  'udp.srcport': 'number',
  'udp.dstport': 'number',
  'udp.port': 'number',
  'udp.length': 'number',
  'udp.stream': 'number',
  'dns.id': 'number',
  'dns.flags.response': 'number',
  'dns.qry.name': 'string',
  'dns.qry.type': 'number',
  'dns.a': 'ipv4',
  'dns.txt': 'string',
  'http.request': 'number',
  'http.request.method': 'string',
  'http.request.uri': 'string',
  'http.host': 'string',
  'http.file_data': 'string',
  'http.response': 'number',
  'http.response.code': 'number',
  'tls.record.content_type': 'number',
  'tls.handshake.type': 'number',
  'tls.handshake.extensions_server_name': 'string',
  'ftp.request': 'number',
  'ftp.request.command': 'string',
  'ftp.request.arg': 'string',
  'ftp.response': 'number',
  'ftp.response.code': 'number',
};

type CmpOp = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';

type Node =
  | { kind: 'and' | 'or'; left: Node; right: Node }
  | { kind: 'not'; expr: Node }
  | { kind: 'present'; field: string }
  | { kind: 'cmp'; field: string; op: CmpOp; value: Value };

type Value =
  | { type: 'number'; n: number }
  | { type: 'string'; s: string }
  | { type: 'cidr'; base: number; mask: number };

export type FilterResult = { ok: true; test: (p: Packet) => boolean; empty: boolean } | { ok: false; error: string };

interface Token {
  kind: 'lparen' | 'rparen' | 'and' | 'or' | 'not' | 'op' | 'word' | 'string';
  text: string;
  pos: number;
}

const WORD_OPS: Record<string, CmpOp> = { eq: '==', ne: '!=', gt: '>', lt: '<', ge: '>=', le: '<=', contains: 'contains' };

class FilterError extends Error {}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === '&&' || two === '||') {
      tokens.push({ kind: two === '&&' ? 'and' : 'or', text: two, pos: i });
      i += 2;
      continue;
    }
    if (['==', '!=', '>=', '<='].includes(two)) {
      tokens.push({ kind: 'op', text: two, pos: i });
      i += 2;
      continue;
    }
    if (c === '>' || c === '<') {
      tokens.push({ kind: 'op', text: c, pos: i });
      i++;
      continue;
    }
    if (c === '!') {
      tokens.push({ kind: 'not', text: c, pos: i });
      i++;
      continue;
    }
    if (c === '(' || c === ')') {
      tokens.push({ kind: c === '(' ? 'lparen' : 'rparen', text: c, pos: i });
      i++;
      continue;
    }
    if (c === '=') throw new FilterError(`"=" is not an operator here. Use "==" to compare.`);
    if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\' && j + 1 < src.length) j++;
        s += src[j];
        j++;
      }
      if (j >= src.length) throw new FilterError('The quoted string is missing its closing ".');
      tokens.push({ kind: 'string', text: s, pos: i });
      i = j + 1;
      continue;
    }
    const m = /^[A-Za-z0-9_.:/\-]+/.exec(src.slice(i));
    if (!m) throw new FilterError(`Unexpected character "${c}".`);
    const word = m[0];
    const lower = word.toLowerCase();
    if (lower === 'and' || lower === 'or' || lower === 'not') tokens.push({ kind: lower, text: word, pos: i });
    else if (lower in WORD_OPS) tokens.push({ kind: 'op', text: WORD_OPS[lower], pos: i });
    else tokens.push({ kind: 'word', text: word, pos: i });
    i += word.length;
  }
  return tokens;
}

function parseIpv4(s: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  if (o.some((n) => n > 255)) return null;
  return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}

function parseValue(field: string, op: CmpOp, tok: Token): Value {
  const type = FIELD_TYPES[field];
  const raw = tok.text;
  if (op === 'contains') {
    if (type === 'number') throw new FilterError(`"contains" needs a text field; ${field} is a number.`);
    return { type: 'string', s: raw };
  }
  if (type === 'number') {
    const n = /^0x[0-9a-f]+$/i.test(raw) ? parseInt(raw, 16) : /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;
    if (tok.kind === 'string' || Number.isNaN(n)) throw new FilterError(`${field} holds a number, but "${raw}" is not one.`);
    return { type: 'number', n };
  }
  if (op !== '==' && op !== '!=') throw new FilterError(`"${op}" compares numbers; ${field} is not a number. Try == or contains.`);
  if (type === 'ipv4') {
    const [addr, bits, extra] = raw.split('/');
    const base = parseIpv4(addr);
    const maskBits = bits === undefined ? 32 : /^\d+$/.test(bits) ? Number(bits) : NaN;
    if (base === null || extra !== undefined || !(maskBits >= 0 && maskBits <= 32)) {
      throw new FilterError(`"${raw}" is not an IPv4 address or CIDR block.`);
    }
    const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
    return { type: 'cidr', base: (base & mask) >>> 0, mask };
  }
  if (type === 'mac') {
    const mac = raw.toLowerCase().replace(/-/g, ':');
    if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(mac)) throw new FilterError(`"${raw}" is not a MAC address.`);
    return { type: 'string', s: mac };
  }
  return { type: 'string', s: raw };
}

class Parser {
  private i = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek() {
    return this.tokens[this.i];
  }

  parse(): Node {
    const node = this.or();
    const extra = this.peek();
    if (extra) {
      throw new FilterError(
        extra.kind === 'rparen' ? 'There is a ")" without a matching "(".' : `Unexpected "${extra.text}". Join conditions with && or ||.`,
      );
    }
    return node;
  }

  private or(): Node {
    let left = this.and();
    while (this.peek()?.kind === 'or') {
      this.i++;
      left = { kind: 'or', left, right: this.and() };
    }
    return left;
  }

  private and(): Node {
    let left = this.unary();
    while (this.peek()?.kind === 'and') {
      this.i++;
      left = { kind: 'and', left, right: this.unary() };
    }
    return left;
  }

  private unary(): Node {
    const t = this.peek();
    if (!t) throw new FilterError('The filter ends early. Something is missing after the last operator.');
    if (t.kind === 'not') {
      this.i++;
      return { kind: 'not', expr: this.unary() };
    }
    if (t.kind === 'lparen') {
      this.i++;
      const inner = this.or();
      if (this.peek()?.kind !== 'rparen') throw new FilterError('A "(" is missing its closing ")".');
      this.i++;
      return inner;
    }
    if (t.kind !== 'word') throw new FilterError(`Expected a field name but found "${t.text}".`);
    this.i++;
    const field = t.text.toLowerCase();
    if (!(field in FIELD_TYPES)) throw new FilterError(`"${t.text}" is not a field this lab knows. See the field list below the filter bar.`);
    const op = this.peek();
    if (op?.kind !== 'op') return { kind: 'present', field };
    this.i++;
    const valueTok = this.peek();
    if (!valueTok || (valueTok.kind !== 'word' && valueTok.kind !== 'string')) {
      throw new FilterError(`Expected a value after "${op.text}".`);
    }
    this.i++;
    const cmpOp = op.text as CmpOp;
    if (FIELD_TYPES[field] === 'protocol') throw new FilterError(`"${field}" is a protocol. Use it alone (for example: ${field}) or compare one of its fields.`);
    return { kind: 'cmp', field, op: cmpOp, value: parseValue(field, cmpOp, valueTok) };
  }
}

function matchOne(v: FieldValue, op: CmpOp, value: Value): boolean {
  if (op === 'contains') return String(v).includes((value as { s: string }).s);
  if (value.type === 'cidr') {
    const ip = parseIpv4(String(v));
    return ip !== null && ((ip & value.mask) >>> 0) === value.base;
  }
  if (value.type === 'number') {
    const n = Number(v);
    switch (op) {
      case '==':
      case '!=':
        return n === value.n;
      case '>':
        return n > value.n;
      case '<':
        return n < value.n;
      case '>=':
        return n >= value.n;
      case '<=':
        return n <= value.n;
    }
  }
  return String(v).toLowerCase() === (value as { s: string }).s.toLowerCase();
}

function evaluate(node: Node, p: Packet): boolean {
  switch (node.kind) {
    case 'and':
      return evaluate(node.left, p) && evaluate(node.right, p);
    case 'or':
      return evaluate(node.left, p) || evaluate(node.right, p);
    case 'not':
      return !evaluate(node.expr, p);
    case 'present':
      return p.fields.has(node.field);
    case 'cmp': {
      const values = p.fields.get(node.field) ?? [];
      if (node.op === '!=') return values.length > 0 && !values.some((v) => matchOne(v, '!=', node.value));
      return values.some((v) => matchOne(v, node.op, node.value));
    }
  }
}

/** Compile a display filter. An empty filter matches every packet. */
export function compileFilter(text: string): FilterResult {
  if (!text.trim()) return { ok: true, test: () => true, empty: true };
  try {
    const ast = new Parser(tokenize(text)).parse();
    return { ok: true, test: (p) => evaluate(ast, p), empty: false };
  } catch (e) {
    if (e instanceof FilterError) return { ok: false, error: e.message };
    throw e;
  }
}
