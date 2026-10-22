import { loadLeaderboard } from './data-source.js?v=adff390298ae';
import { renderRows, presentation, formatConfidence } from './view.js?v=adff390298ae';

// Old chart links continue to lead to the two tables after the redesign.
const legacy = location.hash.slice(1);
if (['bars', 'table', 'line', 'dots'].includes(legacy)) {
  history.replaceState(null, '', '#leaderboard');
} else if (legacy.includes('objective=') || legacy.includes('subjective=')) {
  history.replaceState(null, '', '#leaderboard');
}

for (const board of document.querySelectorAll('[data-leaderboard]')) {
  const status = board.querySelector('[data-refresh-status]');
  const retry = board.querySelector('[data-retry]');
  let request;
  let currentSnapshot;
  try {
    currentSnapshot = JSON.stringify(JSON.parse(board.querySelector('[data-board-snapshot]')?.textContent ?? 'null'));
  } catch { /* A damaged embedded snapshot does not block a validated refresh. */ }

  async function refresh() {
    if (request) return;
    request = new AbortController();
    const timer = setTimeout(() => request?.abort(), 10000);
    status.textContent = '';
    retry.hidden = true;
    board.setAttribute('aria-busy', 'true');
    try {
      const data = await loadLeaderboard(board.dataset.source, { signal: request.signal, kind: board.dataset.kind });
      const nextSnapshot = JSON.stringify(data);
      if (nextSnapshot !== currentSnapshot) {
        const rows = renderRows(data);
        const text = presentation(data);
        board.querySelector('tbody').innerHTML = rows;
        for (const direction of board.querySelectorAll('[data-field="direction"], [data-field="metric-direction"]')) {
          direction.textContent = text.direction;
          direction.setAttribute('aria-label', text.directionText);
        }
        const label = board.querySelector('[data-field="score-label"]');
        if (label) label.textContent = data.score.sourceLabel;
        const confidence = board.querySelector('[data-field="confidence-label"]');
        if (confidence) confidence.textContent = `(${formatConfidence(data.score.confidenceLevel)}% CI)`;
        currentSnapshot = nextSnapshot;
      }
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
  refresh();
}
