import { LESSONS, VIETNAMESE_LESSONS, findLesson } from './src/lessons.js';
import { renderWorksheetSVG } from './src/worksheet.js';

const byId = (id) => document.getElementById(id);
const selects = { lesson: byId('lesson'), paper: byId('paper') };
const groups = {
  font: byId('font'),
  style: byId('style'),
  darkness: byId('darkness'),
  align: byId('align'),
};

const lessonSets = { vi: VIETNAMESE_LESSONS, en: LESSONS };

function value(id) {
  return selects[id] ? selects[id].value : groups[id].querySelector('button.active').dataset.value;
}

function fillLessons() {
  const lessons = lessonSets[value('font')] ?? LESSONS;
  selects.lesson.replaceChildren();
  for (const lesson of lessons) {
    const option = document.createElement('option');
    option.value = lesson.id;
    option.textContent = lesson.title;
    selects.lesson.append(option);
  }
  const requested = decodeURIComponent(location.hash.slice(1));
  selects.lesson.value = findLesson(lessons, requested).id;
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
  const lesson = findLesson(lessonSets[value('font')] ?? LESSONS, selects.lesson.value);
  byId('sheet').innerHTML = renderWorksheetSVG(lesson, options(), fontBytes);
}

async function init() {
  fillLessons();
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
    if (group === groups.font) fillLessons();
    render();
  });
}
byId('download').addEventListener('click', () => window.print());
init();
