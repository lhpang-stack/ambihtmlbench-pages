import { validateLeaderboard } from './leaderboard.js';

/** Adapt a future API response here, then validate before touching the page. */
const identity = (value) => value;

/** Static JSON today; a compatible HTTP endpoint can use the same reader later. */
export async function loadLeaderboard(source, { fetchImpl = globalThis.fetch, signal, adapt = identity } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');
  const response = await fetchImpl(source, {
    headers: { Accept: 'application/json' },
    cache: 'no-cache',
    signal,
  });
  if (!response.ok) throw new Error(`Leaderboard request failed (${response.status})`);
  return validateLeaderboard(await adapt(await response.json()));
}
