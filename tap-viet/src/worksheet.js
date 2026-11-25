const BASE_OPACITY = { bold: 1, mild: 0.65, light: 0.4 };
const STYLES = ['solid', 'outline'];
const LEVELS = ['bold', 'mild', 'light'];
const PAPERS = ['oly4', 'oly5', 'ke7'];
const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ENTITIES[char]);
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
  return [base, +(base * 0.6).toFixed(2), +(base * 0.35).toFixed(2)];
}

export function traceClass(style, level) {
  const safeStyle = STYLES.includes(style) ? style : 'solid';
  const safeLevel = LEVELS.includes(level) ? level : 'bold';
  return `trace trace--${safeStyle} trace--${safeLevel}`;
}

export function renderWorksheetHTML(lesson, options = {}) {
  const { style, darkness, align, font, paper } = options ?? {};
  const safeAlign = ['left', 'center', 'right'].includes(align) ? align : 'left';
  const safeFont = font === 'vi' ? 'vi' : 'en';
  const safePaper = PAPERS.includes(paper) ? paper : 'oly4';
  const classes = traceClass(style, darkness);
  const opacities = traceOpacities(darkness);

  const rows = buildRows(lesson)
    .map((row) => {
      const ipa = row.ipa ? `<span class="row__ipa">${escapeHTML(row.ipa)}</span>` : '';
      const meaning = row.meaning
        ? `<span class="row__meaning">${escapeHTML(row.meaning)}</span>`
        : '';
      const traces = opacities
        .map(
          (opacity) =>
            `<div class="row__trace ${classes}" style="--trace-opacity:${opacity}">` +
            `<span>${escapeHTML(row.english)}</span></div>`,
        )
        .join('');
      return (
        `<section class="row row--${row.kind}">` +
        `<div class="row__model"><span class="row__english">${escapeHTML(row.english)}</span>${ipa}${meaning}</div>` +
        traces +
        '</section>'
      );
    })
    .join('');

  return `<div class="sheet__inner sheet--${safePaper} sheet--${safeAlign} sheet--font-${safeFont}">${rows}</div>`;
}
