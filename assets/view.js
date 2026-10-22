import { modelMeta, logoPath } from './model-meta.js?v=e5171ca22604';

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

export function formatScore(value, precision) {
  return value.toFixed(precision);
}

export function modelIcon(meta, size = 24) {
  const logo = logoPath(meta);
  return logo ? `<img src="${logo}" width="${size}" height="${size}" alt="">`
    : '<span class="unknown-mark" aria-hidden="true">&lt;/&gt;</span>';
}

export function renderRows(data) {
  const subjective = data.kind === 'subjective';
  if (!data.rows.length) return `<tr class="empty-row"><td colspan="${subjective ? 5 : 3}">No results</td></tr>`;
  return data.rows.map((row, index) => {
    const meta = modelMeta(row.model);
    return `<tr data-model-index="${index}" class="color-${meta.palette}">
      <td class="rank">${row.rank}</td>
      <th scope="row" class="model"><span class="model-identity"><span class="model-icon">${modelIcon(meta)}</span><span class="model-name">${escapeHTML(row.model)}</span></span></th>
      <td class="score"><span class="score-chip">${formatScore(row.score, data.score.precision)}</span>${subjective ? `<span class="confidence-interval">[${row.confidenceInterval.map(value => formatScore(value, data.score.precision)).join(', ')}]</span>` : ''}</td>
      ${subjective ? `<td class="preference">${formatScore(row.preferenceRate, 2)}%</td><td class="rank-interval">[${row.rankInterval.join(', ')}]</td>` : ''}
    </tr>`;
  }).join('\n');
}

/** Keep BT ranking/table values separate from the percentage shown in charts. */
export function chartData(data) {
  return data.kind === 'subjective' ? {
    ...data,
    score: { sourceLabel: 'Soft preference score rate', direction: 'higher', precision: 2, unit: '%' },
    rows: data.rows.map(row => ({ rank: row.rank, model: row.model, score: row.preferenceRate })),
  } : data;
}

export function presentation(data) {
  return {
    direction: data.score.direction === 'higher' ? '↑' : '↓',
    directionText: data.score.direction === 'higher' ? 'Higher is better' : 'Lower is better',
  };
}
