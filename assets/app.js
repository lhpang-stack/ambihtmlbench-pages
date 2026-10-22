import { loadLeaderboard } from './data-source.js';
import { renderRows, presentation } from './view.js';
import { renderChart } from './chart.js';

const board = document.querySelector('[data-leaderboard]');
const status = document.querySelector('[data-refresh-status]');
const retry = document.querySelector('[data-retry]');
const viewInputs = [...document.querySelectorAll('input[name="view"]')];
let request;
let currentSnapshot;
try {
  currentSnapshot = JSON.stringify(JSON.parse(document.querySelector('#leaderboard-snapshot')?.textContent ?? 'null'));
} catch { /* A damaged embedded snapshot does not block a validated refresh. */ }

function readView() {
  const view = location.hash.slice(1);
  const input = viewInputs.find((element) => element.value === view)
    ?? viewInputs.find((element) => element.defaultChecked);
  if (input) input.checked = true;
}
viewInputs.forEach((input) => input.addEventListener('change', () => {
  if (input.checked) history.replaceState(null, '', `#${input.value}`);
}));
window.addEventListener('hashchange', readView);
readView();

function render(data) {
  const nextSnapshot = JSON.stringify(data);
  if (nextSnapshot === currentSnapshot) return;
  // Generate all views before replacing any DOM. A failure retains every view.
  const rows = renderRows(data);
  const charts = Object.fromEntries(['bars', 'line', 'dots'].map((kind) => [kind, renderChart(data, kind)]));
  const text = presentation(data);
  board.querySelector('tbody').innerHTML = rows;
  for (const [kind, html] of Object.entries(charts)) board.querySelector(`[data-chart="${kind}"]`).innerHTML = html;
  const direction = board.querySelector('[data-field="direction"]');
  direction.textContent = text.direction;
  direction.setAttribute('aria-label', text.directionText);
  currentSnapshot = nextSnapshot;
}

async function refresh() {
  if (!board || request) return;
  request = new AbortController();
  const timer = setTimeout(() => request?.abort(), 10000);
  retry.hidden = true;
  status.textContent = '';
  board.setAttribute('aria-busy', 'true');
  try {
    render(await loadLeaderboard(board.dataset.source, { signal: request.signal }));
  } catch {
    status.textContent = 'Unable to update results.';
    retry.hidden = false;
  } finally {
    clearTimeout(timer);
    request = null;
    board.setAttribute('aria-busy', 'false');
  }
}
retry?.addEventListener('click', refresh);
function highlight(index) {
  board.querySelectorAll('[data-model-index]').forEach((element) => {
    element.classList.toggle('is-highlighted', element.dataset.modelIndex === index);
  });
}
board?.addEventListener('pointerover', (event) => highlight(event.target.closest('[data-model-index]')?.dataset.modelIndex));
board?.addEventListener('pointerleave', () => highlight(null));
board?.addEventListener('focusin', (event) => highlight(event.target.closest('[data-model-index]')?.dataset.modelIndex));
board?.addEventListener('focusout', () => highlight(null));
if (board) refresh();
