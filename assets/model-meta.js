// Visual identity is independent of leaderboard data. No provider fields are
// required. Models that share a family icon also share its palette.
export const palettes = Object.freeze({
  gemini: '#367be7', kimi: '#109ca5', claude: '#dd8150', qwen: '#8055df',
  gpt: '#159471', ernie: '#c69918',
  glm: '#5866ce', grok: '#516174', unknown: '#7d8477',
});

const families = [
  { match: /^Gemini\b/i, id: 'gemini', logo: 'gemini-color' },
  { match: /^Kimi(?:\b|-)/i, id: 'kimi', logo: 'kimi-color' },
  { match: /^Claude\b/i, id: 'claude', logo: 'claude-color' },
  { match: /^Qwen/i, id: 'qwen', logo: 'qwen-color' },
  { match: /^GPT(?:\b|-)/i, id: 'gpt', logo: 'openai' },
  { match: /^ERNIE(?:\b|-)/i, id: 'ernie', logo: 'wenxin-color' },
  { match: /^GLM(?:\b|-)/i, id: 'glm', logo: 'glmv-color' },
  { match: /^Grok(?:\b|-)/i, id: 'grok', logo: 'grok' },
];

export function modelMeta(model) {
  const text = model.trim();
  const family = families.find(({ match }) => match.test(text));
  const id = family?.id ?? 'unknown';
  return { id, palette: id, logo: family?.logo ?? null, color: palettes[id] };
}

export function logoPath(meta) {
  return meta.logo ? `./assets/brands/${meta.logo}.svg` : null;
}

export function paletteCSS() {
  return Object.entries(palettes).map(([id, color]) => `.color-${id} { --model-color: ${color}; }`).join('\n');
}
