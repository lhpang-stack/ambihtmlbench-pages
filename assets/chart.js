import { escapeHTML, formatScore, modelIcon } from './view.js?v=e5171ca22604';
import { modelMeta } from './model-meta.js?v=e5171ca22604';

// Zero is always included. A normalized domain avoids overflow for finite scores
// at either numeric extreme; it also supports negative scores and all-zero data.
export function chartScale(scores) {
  const maxAbsolute = Math.max(...scores.map(Math.abs), 0) || 1;
  const magnitude = 10 ** Math.floor(Math.log10(maxAbsolute)) || maxAbsolute;
  const normalized = scores.map((score) => score / magnitude);
  const low = Math.min(0, ...normalized);
  const high = Math.max(0, ...normalized) || (low === 0 ? 1 : 0);
  const rawStep = (high - low) / 5;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((value) => value * power).find((value) => value >= rawStep) || power * 10;
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step;
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, index) => {
    const rawValue = min + index * step;
    const normalizedValue = Math.abs(rawValue) < step * 1e-10 ? 0 : rawValue;
    return { value: normalizedValue * magnitude, position: (max - normalizedValue) / (max - min) };
  });
  return {
    ticks: ticks.filter(({ value }) => Number.isFinite(value)),
    position: (value) => (max - value / magnitude) / (max - min),
  };
}

function axisLabel(value) {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1e6 || Math.abs(value) < .01) return value.toExponential(1);
  return new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value);
}

function chartLabels(data) {
  return data.rows.map((row, index) => {
    const meta = modelMeta(row.model);
    return `<div class="chart-label color-${meta.palette}" data-model-index="${index}"><span class="chart-icon">${modelIcon(meta, 25)}</span><span class="chart-model-name">${escapeHTML(row.model)}</span></div>`;
  }).join('');
}

function plotScale(data) {
  return chartScale(data.score.unit === '%' ? [0, 100] : data.rows.map(({ score }) => score));
}

function chartValue(data, value) { return `${formatScore(value, data.score.precision)}${data.score.unit ?? ''}`; }

function chartGeometry(data, compact) {
  const width = Math.max(compact ? 600 : 1000, data.rows.length * (compact ? 54 : 96) + 48);
  // Match the HTML label grid's 4% / .8% gutters at every canvas width.
  const left = width * .04, right = width * .008, top = 32, height = 220;
  const scale = plotScale(data);
  const column = (width - left - right) / data.rows.length;
  return { width, left, right, top, height, scale, x: (index) => left + column * (index + .5), y: (score) => top + scale.position(score) * height };
}

function verticalGrid({ scale, top, height, width, left, right, y }) {
  return scale.ticks.map(({ value, position }) => {
    const tickY = top + position * height;
    return `<g class="chart-tick"><line x1="${left}" x2="${width - right}" y1="${tickY}" y2="${tickY}"/><text x="${left - 12}" y="${tickY + 4}" text-anchor="end">${axisLabel(value)}</text></g>`;
  }).join('') + `<line class="zero-line" x1="${left}" x2="${width - right}" y1="${y(0)}" y2="${y(0)}"/>`;
}

function verticalFrame(data, geometry, content, label) {
  return `<div class="chart-scroll" tabindex="0" role="region" aria-label="${label}"><div class="chart-canvas">
    <svg class="score-chart" width="${geometry.width}" viewBox="0 0 ${geometry.width} 282" role="group" aria-label="${label}">${verticalGrid(geometry)}${content}</svg>
    <div class="chart-labels">${chartLabels(data)}</div>
  </div></div>`;
}

function markLabel(row, data) {
  return `Rank ${row.rank}, ${escapeHTML(row.model)}, ${escapeHTML(data.score.sourceLabel)} ${chartValue(data, row.score)}`;
}

export function renderChart(data, kind = 'bars', { namespace = 'score', compact = false } = {}) {
  if (!['bars', 'line', 'dots'].includes(kind)) throw new Error(`Unknown chart: ${kind}`);
  if (!/^[a-z][a-z0-9-]*$/.test(namespace)) throw new Error('Invalid chart namespace');
  if (!data.rows.length) return '<p class="chart-empty">No results</p>';
  if (kind === 'dots') return renderDots(data);
  const g = chartGeometry(data, compact);
  const baseline = g.y(0);
  if (kind === 'line') {
    const points = data.rows.map((row, index) => `${g.x(index)},${g.y(row.score)}`);
    const path = points.map((point, index) => `${index ? 'L' : 'M'}${point}`).join(' ');
    const stops = data.rows.map((row, index) => `<stop offset="${index / Math.max(1, data.rows.length - 1)}" stop-color="${modelMeta(row.model).color}"/>`).join('');
    const marks = data.rows.map((row, index) => {
      const meta = modelMeta(row.model);
      return `<g class="chart-mark color-${meta.palette}" data-model-index="${index}" tabindex="0" role="img" aria-label="${markLabel(row, data)}"><circle class="point-halo" cx="${g.x(index)}" cy="${g.y(row.score)}" r="14" fill="${meta.color}"/><circle class="line-point" cx="${g.x(index)}" cy="${g.y(row.score)}" r="6" fill="${meta.color}"/><text class="chart-value" x="${g.x(index)}" y="${g.y(row.score) - 20}" text-anchor="middle">${chartValue(data, row.score)}</text></g>`;
    }).join('');
    return verticalFrame(data, g, `<defs><linearGradient id="${namespace}-line-color" gradientUnits="userSpaceOnUse" x1="${g.x(0)}" x2="${g.x(data.rows.length - 1)}">${stops}</linearGradient><linearGradient id="${namespace}-line-area" x2="0" y2="1"><stop stop-color="#8292a7" stop-opacity=".12"/><stop offset="1" stop-color="#8292a7" stop-opacity="0"/></linearGradient></defs><path class="line-area" d="${path} L${g.x(data.rows.length - 1)},${baseline} L${g.x(0)},${baseline} Z" fill="url(#${namespace}-line-area)"/><path class="score-line" d="${path}" pathLength="1" stroke="url(#${namespace}-line-color)"/>${marks}`, 'Line chart');
  }
  const bars = data.rows.map((row, index) => {
    const meta = modelMeta(row.model);
    const valueY = g.y(row.score);
    const barWidth = compact ? 20 : 34;
    return `<g class="chart-mark color-${meta.palette}" data-model-index="${index}" tabindex="0" role="img" aria-label="${markLabel(row, data)}">
      <rect class="bar-hit" x="${g.x(index) - 35}" y="${g.top}" width="70" height="${g.height}" rx="7"/>
      <rect class="score-bar${row.score < 0 ? ' negative-bar' : ''}" x="${g.x(index) - barWidth / 2}" y="${Math.min(valueY, baseline)}" width="${barWidth}" height="${Math.abs(baseline - valueY)}" rx="4" fill="${meta.color}"/>
      <text class="chart-value" x="${g.x(index)}" y="${row.score < 0 ? valueY + 20 : valueY - 13}" text-anchor="middle">${chartValue(data, row.score)}</text>
    </g>`;
  }).join('');
  return verticalFrame(data, g, bars, 'Bar chart');
}

function renderDots(data) {
  const scale = plotScale(data);
  const x = (score) => 6 + (1 - scale.position(score)) * 88;
  const ticks = scale.ticks.map(({ value }) => `<g class="dot-tick"><text x="${x(value)}%" y="17" text-anchor="middle">${axisLabel(value)}</text></g>`).join('');
  const rows = data.rows.map((row, index) => {
    const meta = modelMeta(row.model);
    const grid = scale.ticks.map(({ value }) => `<line class="dot-grid" x1="${x(value)}%" x2="${x(value)}%" y1="0" y2="32"/>`).join('');
    return `<div class="dot-row color-${meta.palette}" data-model-index="${index}" role="listitem"><span class="model-identity"><span class="dot-icon">${modelIcon(meta, 22)}</span><span class="model-name">${escapeHTML(row.model)}</span></span><svg class="dot-plot" width="100%" height="32" aria-hidden="true">${grid}<line class="dot-stem" x1="${x(0)}%" x2="${x(row.score)}%" y1="16" y2="16"/><circle class="dot-halo" cx="${x(row.score)}%" cy="16" r="10"/><circle class="dot-point" cx="${x(row.score)}%" cy="16" r="5"/></svg><span class="dot-value">${chartValue(data, row.score)}</span></div>`;
  }).join('');
  return `<div class="dot-chart"><div class="dot-axis" aria-hidden="true"><span></span><svg width="100%" height="28">${ticks}</svg><span></span></div><div role="list">${rows}</div></div>`;
}
