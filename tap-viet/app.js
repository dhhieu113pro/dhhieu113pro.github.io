import { LESSONS, findLesson } from './src/lessons.js';
import { renderWorksheetHTML } from './src/worksheet.js';

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

function render() {
  const lesson = findLesson(LESSONS, selects.lesson.value);
  byId('sheet').innerHTML = renderWorksheetHTML(lesson, {
    style: selects.style.value,
    darkness: selects.darkness.value,
    paper: selects.paper.value,
    font: selects.font.value,
    align: selects.align.value,
  });
}

for (const select of Object.values(selects)) {
  select.addEventListener('change', render);
}
byId('download').addEventListener('click', () => window.print());
render();
