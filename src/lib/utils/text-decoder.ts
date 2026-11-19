/**
 * Comprehensive HTML/XML Entity Decoder & Cleaner
 * Handles decimal entities (&#8216;), hex entities (&#x2018;), named entities (&ldquo;, &amp;, etc.),
 * and normalizes quotes and typography for clean graphic card rendering.
 */

const NAMED_HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&sbquo;': '‚',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&bdquo;': '„',
  '&hellip;': '…',
  '&ndash;': '–',
  '&mdash;': '—',
  '&nbsp;': ' ',
  '&thinsp;': ' ',
  '&ensp;': ' ',
  '&emsp;': ' ',
  '&bull;': '•',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&laquo;': '«',
  '&raquo;': '»',
  '&prime;': '′',
  '&Prime;': '″',
  '&minus;': '-',
  '&deg;': '°',
  '&cent;': '¢',
  '&pound;': '£',
  '&euro;': '€',
  '&yen;': '¥',
  '&sect;': '§',
  '&infin;': '∞',
};

/**
 * Decodes all forms of HTML and XML numeric and named entities in text.
 * Runs multiple passes if nested/double-encoded (e.g. &amp;#8216; -> &#8216; -> ‘).
 */
export function decodeHtmlEntities(str: string): string {
  if (!str || typeof str !== 'string') return '';

  let decoded = str;

  // Run up to 2 passes to handle double-encoding (like &amp;#8216;)
  for (let pass = 0; pass < 2; pass++) {
    const prev = decoded;

    // 1. Decimal entities: &#8216; &#39; &#039;
    decoded = decoded.replace(/&#(\d+);?/g, (match, dec) => {
      try {
        const code = parseInt(dec, 10);
        if (!isNaN(code) && code > 0 && code <= 0x10ffff) {
          return String.fromCodePoint(code);
        }
      } catch {}
      return match;
    });

    // 2. Hex entities: &#x2018; &#x27;
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);?/g, (match, hex) => {
      try {
        const code = parseInt(hex, 16);
        if (!isNaN(code) && code > 0 && code <= 0x10ffff) {
          return String.fromCodePoint(code);
        }
      } catch {}
      return match;
    });

    // 3. Named entities
    decoded = decoded.replace(/&[a-zA-Z]+;?/g, (match) => {
      const normalized = match.endsWith(';') ? match : `${match};`;
      if (NAMED_HTML_ENTITIES[normalized.toLowerCase()]) {
        return NAMED_HTML_ENTITIES[normalized.toLowerCase()];
      }
      return match;
    });

    if (decoded === prev) break;
  }

  return decoded;
}

/**
 * Clean and normalize headline text for news cards, social posts, and thumbnails.
 */
export function cleanHeadlineText(str: string): string {
  if (!str) return '';
  let cleaned = decodeHtmlEntities(str);

  // Normalize duplicate spaces, weird tabs/newlines
  cleaned = cleaned.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();

  return cleaned;
}
