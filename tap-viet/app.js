import { LESSONS, findLesson } from './src/lessons.js';
import { renderWorksheetSVG } from './src/worksheet.js';

const byId = (id) => document.getElementById(id);
const selects = {
  lesson: byId('lesson'),
  style: byId('style'),
  darkness: byId('darkness'),
  paper: byId('paper'),
  font: byId('font'),
  align: byId('align'),
};

for (const lesson of LESSONS) {
  const option = document.createElement('option');
  option.value = lesson.id;
  option.textContent = lesson.title;
  selects.lesson.append(option);
}

const requested = decodeURIComponent(location.hash.slice(1)) || 'en-2-u3';
selects.lesson.value = findLesson(LESSONS, requested).id;

function options() {
  return {
    style: selects.style.value,
    darkness: selects.darkness.value,
    paper: selects.paper.value,
    font: selects.font.value,
    align: selects.align.value,
  };
}

let fontBytes;

function render() {
  const lesson = findLesson(LESSONS, selects.lesson.value);
  byId('sheet').innerHTML = renderWorksheetSVG(lesson, options(), fontBytes);
}

async function init() {
  const response = await fetch('assets/tieuhoc-vn.ttf');
  fontBytes = await response.arrayBuffer();
  if (document.fonts?.load) {
    await document.fonts.load('5mm TieuhocVN');
    await document.fonts.ready;
  }
  render();
}

for (const select of Object.values(selects)) {
  select.addEventListener('change', render);
}
byId('download').addEventListener('click', () => window.print());
init();
