(() => {
  'use strict';

  // Add literal phrases here if you want broader blocking. No regex required.
  const EXTRA_BLOCKED_PHRASES = [];

  function normalize(value) {
    return String(value ?? '')
      .normalize('NFKD')
      .replace(/[\p{M}\p{Cf}]/gu, '')
      .toLowerCase();
  }

  // Block the full franchise name even without a sequel number.
  // Keep the abbreviation specific to GTA 6 / VI to avoid broad GTA matches.
  // Punctuation/spacing also covers G.T.A., GTA-6 and hashtags.
  const separator = '[^\\p{L}\\p{N}]*';
  const shortName = ['g', 't', 'a'].join(separator);
  const fullName = ['grand', 'theft', 'auto'].join(separator);
  const game = new RegExp(
    '(?<![\\p{L}\\p{N}])(?:' +
    shortName + separator + '(?:6|vi|six)|' +
    fullName + '(?:' + separator + '(?:6|vi|six))?' +
    ')(?![\\p{L}\\p{N}])',
    'u',
  );

  function matches(value) {
    const text = normalize(value);
    return game.test(text) || EXTRA_BLOCKED_PHRASES.some(phrase =>
      normalize(phrase).trim() && text.includes(normalize(phrase).trim()),
    );
  }

  // One isolated-world namespace; no build step or page-world injection.
  globalThis.GTA6Shield = Object.freeze({ matches, normalize });
})();
