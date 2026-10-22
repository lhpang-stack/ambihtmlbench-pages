import { loadLeaderboard } from './data-source.js?v=e5171ca22604';
import { renderBoardViews, formatConfidence } from './board.js?v=e5171ca22604';
import { chartData, presentation } from './view.js?v=e5171ca22604';

const boards = [...document.querySelectorAll('[data-leaderboard]')];
const views = ['bars', 'table', 'line', 'dots'];

function readViews() {
  const hash = location.hash.slice(1);
  const selected = new URLSearchParams(hash);
  for (const board of boards) {
    const value = views.includes(hash) ? hash : selected.get(board.dataset.board);
    const inputs = [...board.querySelectorAll('input[type="radio"]')];
    const input = inputs.find(element => element.value === value) ?? inputs.find(element => element.defaultChecked);
    if (input) input.checked = true;
  }
}
function writeViews() {
  const selected = boards.map(board => [board.dataset.board, board.querySelector('input:checked').value]);
  const hash = new Set(selected.map(([, value]) => value)).size === 1
    ? selected[0][1] : new URLSearchParams(selected).toString();
  history.replaceState(null, '', `#${hash}`);
}
window.addEventListener('hashchange', readViews);
readViews();

for (const board of boards) {
  const status = board.querySelector('[data-refresh-status]');
  const retry = board.querySelector('[data-retry]');
  let request;
  let currentSnapshot;
  try {
    currentSnapshot = JSON.stringify(JSON.parse(board.querySelector('[data-board-snapshot]')?.textContent ?? 'null'));
  } catch { /* A damaged embedded snapshot does not block a validated refresh. */ }

  board.querySelectorAll('input[type="radio"]').forEach(input => input.addEventListener('change', writeViews));
  function render(data) {
    const nextSnapshot = JSON.stringify(data);
    if (nextSnapshot === currentSnapshot) return;
    // Prepare every view before touching this board; the other board is independent.
    const { rows, charts } = renderBoardViews(data, board.dataset.board);
    const text = presentation(data);
    board.querySelector('tbody').innerHTML = rows;
    for (const [kind, html] of Object.entries(charts)) board.querySelector(`[data-chart="${kind}"]`).innerHTML = html;
    const direction = board.querySelector('[data-field="direction"]');
    direction.textContent = text.direction;
    direction.setAttribute('aria-label', text.directionText);
    const metric = chartData(data).score;
    board.querySelector('[data-field="chart-label"]').textContent = `${metric.sourceLabel}${metric.unit ? ` (${metric.unit})` : ''}`;
    const chartDirection = board.querySelector('[data-field="chart-direction"]');
    const chartText = presentation(chartData(data));
    chartDirection.textContent = chartText.direction;
    chartDirection.setAttribute('aria-label', chartText.directionText);
    const confidence = board.querySelector('[data-field="confidence-label"]');
    if (confidence) confidence.textContent = `(${formatConfidence(data.score.confidenceLevel)}% CI)`;
    currentSnapshot = nextSnapshot;
  }
  async function refresh() {
    if (request) return;
    request = new AbortController();
    const timer = setTimeout(() => request?.abort(), 10000);
    retry.hidden = true;
    status.textContent = '';
    board.setAttribute('aria-busy', 'true');
    try {
      render(await loadLeaderboard(board.dataset.source, { signal: request.signal, kind: board.dataset.kind }));
    } catch {
      status.textContent = 'Unable to update results.';
      retry.hidden = false;
    } finally {
      clearTimeout(timer);
      request = null;
      board.setAttribute('aria-busy', 'false');
    }
  }
  retry.addEventListener('click', refresh);
  function highlight(index) {
    board.querySelectorAll('[data-model-index]').forEach(element => {
      element.classList.toggle('is-highlighted', element.dataset.modelIndex === index);
    });
  }
  board.addEventListener('pointerover', event => highlight(event.target.closest('[data-model-index]')?.dataset.modelIndex));
  board.addEventListener('pointerleave', () => highlight(null));
  board.addEventListener('focusin', event => highlight(event.target.closest('[data-model-index]')?.dataset.modelIndex));
  board.addEventListener('focusout', () => highlight(null));
  refresh();
}
