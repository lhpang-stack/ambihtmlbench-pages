import { escapeHTML, renderRows, chartData, presentation } from './view.js?v=48e2a8e56471';
import { renderChart } from './chart.js?v=48e2a8e56471';

const views = {
  bars: ['Bars', '<path d="M3 16.5h14M4.5 13V5M10 13V3M15.5 13V8"/>'],
  table: ['Table', '<rect x="3" y="3.5" width="14" height="13" rx="2"/><path d="M3 8h14M7.5 8v8.5M3 12.3h14"/>'],
  line: ['Line', '<path d="m3 13 5-5 4 3 5-7"/><circle cx="3" cy="13" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="12" cy="11" r="1"/><circle cx="17" cy="4" r="1"/>'],
  dots: ['Dots', '<path d="M3 5h14M3 10h14M3 15h14"/><circle cx="13" cy="5" r="2"/><circle cx="8" cy="10" r="2"/><circle cx="11" cy="15" r="2"/>'],
};

export function renderBoardViews(data, id) {
  const plotted = chartData(data);
  return {
    rows: renderRows(data),
    charts: Object.fromEntries(['bars', 'line', 'dots'].map(kind => [kind, renderChart(plotted, kind, { namespace: id, compact: true })])),
  };
}

export function renderBoard(data, { id, title, source, name }) {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error('Invalid board identifier');
  const subjective = data.kind === 'subjective';
  const { rows, charts } = renderBoardViews(data, id);
  const text = presentation(data);
  const metric = chartData(data).score;
  const metricText = presentation(chartData(data));
  const tabs = Object.entries(views).map(([view, [label, icon]]) => `<label class="view-tab" id="${id}-label-${view}"><input id="${id}-view-${view}" type="radio" name="view-${id}" value="${view}" aria-controls="${id}-panel-${view}"${view === 'bars' ? ' checked' : ''}><svg viewBox="0 0 20 20" aria-hidden="true">${icon}</svg><span>${label}</span></label>`).join('');
  const table = `<div class="table-frame${subjective ? ' subjective-table' : ''}"${subjective ? ' tabindex="0" role="region" aria-label="Subjective leaderboard table"' : ''}><table><caption class="visually-hidden">${escapeHTML(name)} ${escapeHTML(title)} rankings${subjective ? ': BT score with confidence interval, soft preference score rate and rank interval' : ' and scores'}</caption><colgroup><col class="col-rank"><col class="col-model"><col class="col-score">${subjective ? '<col class="col-preference"><col class="col-interval">' : ''}</colgroup><thead><tr><th scope="col" class="rank">Rank</th><th scope="col" class="model">Model</th><th scope="col" class="score">${subjective ? 'BT score' : 'Score'} <span class="direction" data-field="direction" aria-label="${text.directionText}">${text.direction}</span>${subjective ? `<span class="column-detail" data-field="confidence-label">(${formatConfidence(data.score.confidenceLevel)}% CI)</span>` : ''}</th>${subjective ? '<th scope="col" class="preference"><abbr title="Soft preference score rate">Preference<span class="column-detail">rate</span></abbr></th><th scope="col" class="rank-interval">Rank<span class="column-detail">interval</span></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`;
  const panels = Object.keys(views).map(view => `<section id="${id}-panel-${view}" data-panel="${view}" class="view-panel ${view === 'table' ? 'table-panel' : 'chart-panel'}" aria-labelledby="${id}-label-${view}">${view === 'table' ? table : `<div data-chart="${view}">${charts[view]}</div>`}</section>`).join('');
  return `<section class="results board${subjective ? ' subjective-board' : ''}" id="${id}" data-leaderboard data-board="${id}" data-kind="${subjective ? 'subjective' : 'objective'}" data-source="${escapeHTML(source)}" aria-labelledby="${id}-title" aria-busy="false">
    <header class="board-header"><h2 id="${id}-title">${escapeHTML(title)}</h2><p class="board-metric"><span data-field="chart-label">${escapeHTML(metric.sourceLabel)}${metric.unit ? ` (${metric.unit})` : ''}</span> <span class="metric-direction" data-field="chart-direction" aria-label="${metricText.directionText}">${metricText.direction}</span></p></header>
    <fieldset class="view-tabs"><legend class="visually-hidden">${escapeHTML(title)} result view</legend>${tabs}</fieldset>
    ${panels}
    <div class="refresh-message"><p data-refresh-status role="status" aria-live="polite"></p><button type="button" data-retry hidden>Retry</button></div>
    <script type="application/json" data-board-snapshot>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
  </section>`;
}

export function formatConfidence(level) { return Number((level * 100).toFixed(2)); }
