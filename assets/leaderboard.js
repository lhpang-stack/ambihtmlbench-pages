/** The display contract is independent of the DOM, storage and evaluation code. */
export function validateLeaderboard(value) {
  const fail = (message) => { throw new TypeError(`Invalid leaderboard: ${message}`); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('expected an object');
  if (value.schemaVersion !== 1) fail('unsupported schemaVersion');
  if (value.kind !== undefined && !['objective', 'subjective'].includes(value.kind)) fail('unknown leaderboard kind');
  const subjective = value.kind === 'subjective';
  if (!['preview', 'published', 'pending'].includes(value.status)) fail('unknown status');
  if (value.updatedAt !== null) {
    const date = new Date(value.updatedAt);
    if (typeof value.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.updatedAt) ||
        !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.updatedAt) {
      fail('updatedAt must be null or a valid YYYY-MM-DD date');
    }
  }
  const score = value.score;
  if (!score || typeof score.sourceLabel !== 'string' || !score.sourceLabel.trim()) fail('missing score label');
  if (!['higher', 'lower'].includes(score.direction)) fail('unknown score direction');
  if (!Number.isInteger(score.precision) || score.precision < 0 || score.precision > 6) fail('invalid precision');
  if (subjective && !(typeof score.confidenceLevel === 'number' && score.confidenceLevel > 0 && score.confidenceLevel < 1)) fail('invalid confidence level');
  if (!Array.isArray(value.rows)) fail('rows must be an array');
  if (value.status === 'pending' && value.rows.length) fail('pending leaderboard must be empty');
  const models = new Set();
  const rows = value.rows.map((row) => {
    if (!row || !Number.isSafeInteger(row.rank) || row.rank < 1) fail('rank must be a positive integer');
    if (typeof row.model !== 'string' || !row.model.trim()) fail('model must be non-empty');
    // Check whitespace-only names, but keep the supplied display text intact.
    const model = row.model;
    if (models.has(model.trim())) fail(`duplicate model: ${model}`);
    models.add(model.trim());
    if (typeof row.score !== 'number' || !Number.isFinite(row.score)) fail(`non-finite score for ${model}`);
    const result = { rank: row.rank, model, score: row.score };
    if (subjective) {
      const ci = row.confidenceInterval;
      if (!Array.isArray(ci) || ci.length !== 2 || !ci.every(Number.isFinite) || ci[0] > ci[1]) fail(`invalid confidence interval for ${model}`);
      if (typeof row.preferenceRate !== 'number' || !Number.isFinite(row.preferenceRate) || row.preferenceRate < 0 || row.preferenceRate > 100) fail(`invalid preference rate for ${model}`);
      const interval = row.rankInterval;
      if (!Array.isArray(interval) || interval.length !== 2 || !interval.every(n => Number.isSafeInteger(n) && n > 0) || interval[0] > interval[1]) fail(`invalid rank interval for ${model}`);
      Object.assign(result, { confidenceInterval: [...ci], preferenceRate: row.preferenceRate, rankInterval: [...interval] });
    }
    return result;
  });
  // The publisher supplies the order and ranks, including ties and gaps.
  const result = {
    schemaVersion: 1,
    status: value.status,
    updatedAt: value.updatedAt,
    score: { sourceLabel: score.sourceLabel.trim(), direction: score.direction, precision: score.precision },
    rows,
  };
  if (value.kind !== undefined) result.kind = value.kind;
  if (subjective) {
    result.score.confidenceLevel = score.confidenceLevel;
    if (value.method !== undefined) {
      const fields = ['comparisons', 'comparisonsPerModel', 'bootstrapReplicates'];
      if (!value.method || !fields.every(key => Number.isSafeInteger(value.method[key]) && value.method[key] > 0)) fail('invalid method counts');
      result.method = Object.fromEntries(fields.map(key => [key, value.method[key]]));
    }
  }
  return result;
}
