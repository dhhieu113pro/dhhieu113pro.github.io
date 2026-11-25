const u16 = (d, o) => (d[o] << 8) | d[o + 1];
const i16 = (d, o) => (u16(d, o) << 16) >> 16;
const u32 = (d, o) => ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0;
const f2dot14 = (d, o) => i16(d, o) / 16384;
const fmt = (n) => Number(n.toFixed(3)).toString();
const cache = new WeakMap();

function parseFont(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (cache.has(bytes)) return cache.get(bytes);
  if (u32(data, 0) !== 0x00010000) throw new Error('Only TrueType fonts are supported');
  const count = u16(data, 4);
  const tables = {};
  for (let i = 0; i < count; i++) {
    const off = 12 + 16 * i;
    const tag = String.fromCharCode(data[off], data[off + 1], data[off + 2], data[off + 3]);
    tables[tag] = u32(data, off + 8);
  }
  const cmap = parseCmap(data, tables.cmap);
  const unitsPerEm = u16(data, tables.head + 18);
  const indexToLocFormat = i16(data, tables.head + 50);
  const numGlyphs = u16(data, tables.maxp + 4);
  const loca = [];
  for (let i = 0; i <= numGlyphs; i++) {
    loca.push(indexToLocFormat === 0
      ? u16(data, tables.loca + i * 2) * 2
      : u32(data, tables.loca + i * 4));
  }
  const numHMetrics = u16(data, tables.hhea + 34);
  const advances = [];
  for (let i = 0; i < numHMetrics; i++) advances.push(u16(data, tables.hmtx + i * 4));
  const font = {
    data, cmap, unitsPerEm, numGlyphs, loca, glyf: tables.glyf,
    advance: (g) => advances[Math.min(g, numHMetrics - 1)] ?? 0,
  };
  cache.set(bytes, font);
  return font;
}

function parseCmap(data, offset) {
  const n = u16(data, offset + 2);
  for (let i = 0; i < n; i++) {
    const entry = offset + 4 + i * 8;
    const sub = offset + u32(data, entry + 4);
    if (u16(data, sub) !== 4) continue;
    const segX2 = u16(data, sub + 6);
    const seg = segX2 / 2;
    const starts = [];
    const deltas = [];
    const ranges = [];
    const ends = [];
    for (let s = 0; s < seg; s++) {
      ends.push(u16(data, sub + 14 + s * 2));
      starts.push(u16(data, sub + 16 + segX2 + s * 2));
      deltas.push(i16(data, sub + 16 + 2 * segX2 + s * 2));
      ranges.push(u16(data, sub + 16 + 3 * segX2 + s * 2));
    }
    return (code) => {
      for (let s = 0; s < seg; s++) {
        if (code < starts[s] || code > ends[s]) continue;
        if (ranges[s] === 0) return (code + deltas[s]) & 0xffff;
        const pos = sub + 16 + 3 * segX2 + ranges[s] + 2 * (code - starts[s]);
        const g = (u16(data, pos) + deltas[s]) & 0xffff;
        return g === 0 ? 0 : g;
      }
      return 0;
    };
  }
  throw new Error('No Unicode cmap table found');
}

function glyphIndex(font, char) {
  const code = char.codePointAt(0);
  const glyph = font.cmap(code);
  if (!glyph) throw new Error(`Missing glyph for U+${code.toString(16).toUpperCase()}`);
  return glyph;
}

function simpleContours(font, start, end) {
  const d = font.data;
  const numberOfContours = i16(d, start);
  const ends = [];
  for (let i = 0; i < numberOfContours; i++) ends.push(u16(d, start + 10 + i * 2));
  const last = ends.at(-1);
  if (last === undefined || last > 10000) throw new Error('Invalid glyph outline');
  const instructionLength = u16(d, start + 10 + numberOfContours * 2);
  let p = start + 12 + numberOfContours * 2 + instructionLength;
  const flags = [];
  while (flags.length <= last) {
    const flag = d[p++];
    flags.push(flag);
    if (flag & 8) {
      const repeat = d[p++];
      for (let i = 0; i < repeat; i++) flags.push(flag);
    }
  }
  const xs = [];
  let x = 0;
  for (const flag of flags) {
    if (flag & 2) {
      const dx = d[p++];
      x += (flag & 16) ? dx : -dx;
    } else if (!(flag & 16)) {
      x += i16(d, p);
      p += 2;
    }
    xs.push(x);
  }
  const ys = [];
  let y = 0;
  for (const flag of flags) {
    if (flag & 4) {
      const dy = d[p++];
      y += (flag & 32) ? dy : -dy;
    } else if (!(flag & 32)) {
      y += i16(d, p);
      p += 2;
    }
    ys.push(y);
  }
  const result = [];
  let first = 0;
  for (const stop of ends) {
    result.push({
      points: flags.slice(first, stop + 1).map((flag, i) => ({ flag, x: xs[first + i], y: ys[first + i] })),
    });
    first = stop + 1;
  }
  return result;
}

function transform(points, args) {
  return points.map(({ flag, x, y }) => {
    const dx = args.a !== undefined ? args.a * x + args.c * y : x;
    const dy = args.b !== undefined ? args.b * x + args.d * y : y;
    return { flag, x: dx + args.dx, y: dy + args.dy };
  });
}

function contours(font, glyph, depth = 0) {
  if (depth > 8) throw new Error('Composite glyph nesting too deep');
  const start = font.glyf + font.loca[glyph];
  const end = font.glyf + font.loca[glyph + 1];
  if (start === end) return [];
  const d = font.data;
  const numberOfContours = i16(d, start);
  if (numberOfContours > 0) return simpleContours(font, start, end);
  if (numberOfContours !== -1) return [];
  const out = [];
  let p = start + 10;
  for (;;) {
    const flags = u16(d, p);
    const component = u16(d, p + 2);
    p += 4;
    let dx;
    let dy;
    if (flags & 1) {
      dx = i16(d, p);
      dy = i16(d, p + 2);
      p += 4;
    } else {
      dx = (d[p] << 24) >> 24;
      dy = (d[p + 1] << 24) >> 24;
      p += 2;
    }
    const args = { dx, dy };
    if (flags & 8) {
      args.a = args.d = f2dot14(d, p);
      p += 2;
    } else if (flags & 0x40) {
      args.a = f2dot14(d, p);
      args.d = f2dot14(d, p + 2);
      p += 4;
    } else if (flags & 0x80) {
      args.a = f2dot14(d, p);
      args.b = f2dot14(d, p + 2);
      args.c = f2dot14(d, p + 4);
      args.d = f2dot14(d, p + 6);
      p += 8;
    }
    for (const contour of contours(font, component, depth + 1)) {
      out.push({ points: transform(contour.points, args) });
    }
    if (!(flags & 0x20)) break;
  }
  return out;
}

function contourPath(points, sx, sy, x, y) {
  if (!points.length) return '';
  const px = (v) => fmt(x + v * sx);
  const py = (v) => fmt(y - v * sy);
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, flag: 1 });
  const onCurve = points.map((p, i) => (p.flag & 1 ? p : mid(p, points[(i + 1) % points.length])));
  const sequence = onCurve.map((p, i) => ({
    point: p,
    control: points[i].flag & 1 ? null : points[i],
  }));
  if (!(points[0].flag & 1)) {
    const start = mid(points.at(-1), points[0]);
    sequence.unshift({ point: start, control: null });
    sequence.pop();
  }
  let out = `M${px(sequence[0].point.x)} ${py(sequence[0].point.y)}`;
  for (let i = 1; i < sequence.length; i++) {
    const { point, control } = sequence[i];
    out += control
      ? `Q${px(control.x)} ${py(control.y)} ${px(point.x)} ${py(point.y)}`
      : `L${px(point.x)} ${py(point.y)}`;
  }
  return `${out}Z`;
}

// The handwriting font embeds thin dotted-guide dashes in every glyph. They are
// guide strokes, not letter ink; solid rendering must not draw them.
function isGuide(points, unitsPerEm) {
  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    min = Math.min(min, point.y);
    max = Math.max(max, point.y);
  }
  return max - min <= unitsPerEm * 0.02;
}

// Guide dashes in the font are thin rectangles; render them as round dots
// spaced along the stroke, the way tapviet123.com draws nét chấm guides.
function guideDots(points, sx, x, y) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const centerY = y - (Math.min(...ys) + Math.max(...ys)) * sx / 2;
  const width = (max - min) * sx;
  const count = Math.max(1, Math.round(width / 0.45) + 1);
  const radius = 0.12;
  let out = '';
  for (let i = 0; i < count; i++) {
    const cx = fmt(x + min * sx + (count === 1 ? width / 2 : width * i / (count - 1)));
    out += `M${fmt(Number(cx) - radius)} ${fmt(centerY)}` +
      `a${radius} ${radius} 0 1 0 ${2 * radius} 0` +
      `a${radius} ${radius} 0 1 0 ${-2 * radius} 0Z`;
  }
  return out;
}

export function glyphPaths(fontBytes, text, { x = 0, y = 0, size = 5 } = {}) {
  const font = parseFont(fontBytes);
  const sx = size / font.unitsPerEm;
  let cursor = x;
  let ink = '';
  let guide = '';
  for (const char of String(text)) {
    if (char === ' ' || char === '\n' || char === '\t') {
      cursor += font.advance(glyphIndex(font, 'a')) * sx * 0.5;
      continue;
    }
    const glyph = glyphIndex(font, char);
    for (const contour of contours(font, glyph)) {
      if (isGuide(contour.points, font.unitsPerEm)) {
        guide += guideDots(contour.points, sx, cursor, y);
      } else {
        ink += contourPath(contour.points, sx, sx, cursor, y);
      }
    }
    cursor += font.advance(glyph) * sx;
  }
  return { ink, guide };
}

export function glyphPath(fontBytes, text, options = {}) {
  const { ink, guide } = glyphPaths(fontBytes, text, options);
  return ink + guide;
}

export function measureText(fontBytes, text, size = 5) {
  const font = parseFont(fontBytes);
  const sx = size / font.unitsPerEm;
  let width = 0;
  for (const char of String(text)) {
    if (char === ' ' || char === '\n' || char === '\t') {
      width += font.advance(glyphIndex(font, 'a')) * sx * 0.5;
    } else {
      width += font.advance(glyphIndex(font, char)) * sx;
    }
  }
  return width;
}
