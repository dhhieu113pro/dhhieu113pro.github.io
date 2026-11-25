import { LESSONS, findLesson } from './src/lessons.js';
import { renderWorksheetSVG } from './src/worksheet.js';

const byId = (id) => document.getElementById(id);
const selects = { lesson: byId('lesson'), paper: byId('paper') };
const groups = {
  font: byId('font'),
  style: byId('style'),
  darkness: byId('darkness'),
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

function value(id) {
  return selects[id] ? selects[id].value : groups[id].querySelector('button.active').dataset.value;
}

function options() {
  return {
    style: value('style'),
    darkness: value('darkness'),
    paper: value('paper'),
    font: value('font'),
    align: value('align'),
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
for (const group of Object.values(groups)) {
  group.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-value]');
    if (!button) return;
    for (const candidate of group.querySelectorAll('button')) {
      candidate.classList.toggle('active', candidate === button);
    }
    render();
  });
}
byId('download').addEventListener('click', () => window.print());
init();
