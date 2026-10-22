import { validateLeaderboard } from './leaderboard.js?v=e5171ca22604';

/** Adapt a future API response here, then validate before touching the page. */
const identity = (value) => value;

/** Static JSON today; a compatible HTTP endpoint can use the same reader later. */
export async function loadLeaderboard(source, { fetchImpl = globalThis.fetch, signal, adapt = identity, kind } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');
  const response = await fetchImpl(source, {
    headers: { Accept: 'application/json' },
    cache: 'no-cache',
    signal,
  });
  if (!response.ok) throw new Error(`Leaderboard request failed (${response.status})`);
  const result = validateLeaderboard(await adapt(await response.json()));
  if (kind && (result.kind ?? 'objective') !== kind) throw new TypeError('Leaderboard kind does not match this board');
  return result;
}
