/**
 * Sensitive & Spam Word Filter (from Social Auto Poster Pro)
 * 
 * In Hindi news publishing, words like 'मौत', 'आत्महत्या', 'हत्या', 'हादसा'
 * often get flagged or restricted by Facebook's automated scrapers.
 * This helper detects them and provides safe breaking (inserting subtle breaks/ZWS)
 * so human readers see the proper headline while FB scrapers avoid flags.
 */

export const DEFAULT_SENSITIVE_WORDS = [
  'मौत',
  'आत्महत्या',
  'हत्या',
  'हादसा',
  'रेप',
  'बलात्कार',
  'मर्डर',
  'लाश',
  'शव',
  'वारदात',
  'खून',
  'खूनी',
  'कत्ल',
  'suicide',
  'murder',
  'death',
  'killed',
  'rape',
  'accident',
];

/**
 * Break a word subtly with a zero-width space (\u200B) in the middle.
 */
export function breakWord(word: string): string {
  if (word.length <= 2) return word;
  const mid = Math.floor(word.length / 2);
  return word.slice(0, mid) + '\u200B' + word.slice(mid);
}

/**
 * Check if text contains any of the configured sensitive words.
 */
export function findSensitiveWords(text: string, customWords?: string[]): string[] {
  if (!text) return [];
  const list = customWords && customWords.length > 0 ? customWords : DEFAULT_SENSITIVE_WORDS;
  const found: string[] = [];
  const lower = text.toLowerCase();

  for (const word of list) {
    if (lower.includes(word.toLowerCase())) {
      found.push(word);
    }
  }

  return Array.from(new Set(found));
}

/**
 * Sanitize text by breaking all found sensitive words.
 */
export function sanitizeSensitiveWords(text: string, customWords?: string[]): {
  sanitized: string;
  replacedWords: string[];
} {
  if (!text) return { sanitized: '', replacedWords: [] };
  const list = customWords && customWords.length > 0 ? customWords : DEFAULT_SENSITIVE_WORDS;
  let result = text;
  const replaced: string[] = [];

  for (const word of list) {
    const regex = new RegExp(word, 'gi');
    if (regex.test(result)) {
      replaced.push(word);
      result = result.replace(regex, (matched) => breakWord(matched));
    }
  }

  return { sanitized: result, replacedWords: replaced };
}

/**
 * Convenience helper returning sanitized string directly
 */
export function sanitizeText(text: string, customWords?: string[]): string {
  return sanitizeSensitiveWords(text, customWords).sanitized;
}
