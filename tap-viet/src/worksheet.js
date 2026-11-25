import { glyphPaths, measureText } from './font.js';

const BASE_OPACITY = { bold: 1, mild: 0.65, light: 0.4 };
const LEVELS = ['bold', 'mild', 'light'];
const PAPERS = ['oly4', 'oly5', 'ke7'];
const fmt = (n) => Number(n.toFixed(3)).toString();

function line(x1, y1, x2, y2) {
  return `M${fmt(x1)} ${fmt(y1)} L${fmt(x2)} ${fmt(y2)}`;
}

export function gridPaths(paper) {
  const safePaper = PAPERS.includes(paper) ? paper : 'oly4';
  const minor = [];
  const major = [];
  const top = 7.38;
  const bottom = 289.62;
  const left = 5;
  const right = 205;

  if (safePaper === 'ke7') {
    for (let y = 7.38; y <= bottom + 1e-9; y += 7) major.push(line(left, y, right, y));
    for (let y = 10.88; y <= bottom + 1e-9; y += 7) minor.push(line(left, y, right, y));
  } else {
    const row = safePaper === 'oly5' ? 20.16 : 10.08;
    const sub = row / 4;
    for (let y = top; y <= bottom + 1e-9; y += row) major.push(line(left, y, right, y));
    for (let y = top + sub; y < bottom - 1e-9; y += sub) {
      if (Math.abs(((y - top) / row) % 1) > 1e-9) minor.push(line(left, y, right, y));
    }
    major.push(line(left, bottom, right, bottom));
    for (let x = left; x <= right + 1e-9; x += 10) major.push(line(x, top, x, bottom));
    for (let x = left + 2.5; x < right - 1e-9; x += 2.5) {
      if (Math.abs(((x - left) / 10) % 1) > 1e-9) minor.push(line(x, top, x, bottom));
    }
  }

  return [
    { d: minor.join(' '), stroke: '#b5d8ee', width: 0.17, fill: 'none' },
    { d: major.join(' '), stroke: '#3d8fc6', width: 0.18, fill: 'none' },
  ];
}

export function buildRows(lesson) {
  const rows = [];
  if (lesson?.title) {
    rows.push({ kind: 'title', english: lesson.title, ipa: null, meaning: null });
  }
  for (const item of lesson?.vocab ?? []) {
    rows.push({ kind: 'word', english: item.word, ipa: item.ipa, meaning: item.meaning });
  }
  for (const item of lesson?.sentences ?? []) {
    rows.push({ kind: 'sentence', english: item.text, ipa: item.ipa, meaning: item.meaning });
  }
  return rows;
}

export function traceOpacities(level) {
  const base = BASE_OPACITY[level] ?? BASE_OPACITY.bold;
  return [base, +(base * 0.6).toFixed(2)];
}

export function renderWorksheetSVG(lesson, options = {}, fontBytes) {
  const { style, darkness, align, paper } = options ?? {};
  const safePaper = PAPERS.includes(paper) ? paper : 'oly4';
  const safeAlign = ['left', 'center', 'right'].includes(align) ? align : 'left';
  const safeStyle = ['solid', 'outline'].includes(style) ? style : 'solid';
  const safeLevel = LEVELS.includes(darkness) ? darkness : 'bold';
  const outlined = safeStyle === 'outline';
  const grid = gridPaths(safePaper)
    .map((p) => `<path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.width}"/>`)
    .join('');
  const rowHeight = safePaper === 'oly5' ? 20.16 : safePaper === 'ke7' ? 14 : 10.08;
  const size = safePaper === 'oly5' ? 10 : safePaper === 'ke7' ? 7 : 5;
  const startY = 7.38 + rowHeight;
  const opacities = traceOpacities(safeLevel);
  const maxRows = Math.floor((289.62 - 7.38) / rowHeight);
  const samples = buildRows(lesson).slice(0, Math.floor(maxRows / 3));
  const drawRows = (copy = 0, color = '#c4bddc') => samples
    .map((row, i) => {
      const text = row.english ?? '';
      const width = fontBytes ? measureText(fontBytes, text, size) : text.length * size * 0.6;
      const x = safeAlign === 'center' ? 105 - width / 2
        : safeAlign === 'right' ? 204.8 - width
          : 7.5;
      const y = startY + (i * 3 + copy) * rowHeight;
      if (!fontBytes || !text) return '';
      const { ink, guide } = glyphPaths(fontBytes, text, { x, y, size });
      const guides = outlined && guide
        ? `<path class="guide" d="${guide}" fill="${color}" stroke="none" data-baseline="${fmt(y)}"/>`
        : '';
      return `<path class="ink" d="${ink}" data-baseline="${fmt(y)}"/>${guides}`;
    })
    .join('');
  const model = `<g class="model" opacity="1" fill="#3d8fc6" stroke="none">${drawRows(0, '#3d8fc6')}</g>`;
  const traces = opacities
    .map((opacity, index) => {
      const fill = outlined ? 'none' : '#c4bddc';
      const stroke = outlined ? '#c4bddc' : 'none';
      const strokeAttrs = outlined ? ' stroke-width="0.34"' : '';
      return `<g class="trace" opacity="${fmt(opacity)}" fill="${fill}" stroke="${stroke}"${strokeAttrs}>${drawRows(index + 1)}</g>`;
    })
    .join('');
  return (
    `<svg viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg">` +
    `${grid}${model}${traces}</svg>`
  );
}

