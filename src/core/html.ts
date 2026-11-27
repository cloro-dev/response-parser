/**
 * Cleanup helpers that read each part of the page a fixed number of times.
 *
 * A pattern such as /<div[^>]*class="x"[^>]*>[\s\S]*?<\/div>/g starts again
 * at each "<div", and from each start it can read to the end of the page. On
 * a crafted page of a few hundred KB that takes many seconds (CodeQL
 * js/polynomial-redos). A tag pattern here stops at the next "<" or ">", and
 * removeBlocks continues each search from where the last one stopped.
 */

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Where a block ends: text that is part of the block (a string or a
 * pattern), or text that comes after the block (`before`).
 */
export type BlockEnd = string | RegExp | { before: string | RegExp };

function finder(pattern: string | RegExp): RegExp {
  if (typeof pattern === 'string') return new RegExp(escapeRegExp(pattern), 'gi');
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

/**
 * Remove each block that starts with an opening `<tag ...>` that `isStart`
 * accepts and that ends after each of `ends`, found in this order.
 *
 * The result is the same as that of
 * html.replace(/<tag[^>]*>[\s\S]*?END1[\s\S]*?END2/gi, '') when `isStart`
 * tests the attributes, for tags that have no "<" in an attribute value.
 * When the ends of a block are not in the page, no later block can end
 * either, so the search stops.
 */
export function removeBlocks(
  html: string,
  tag: string,
  isStart: (openingTag: string) => boolean,
  ends: BlockEnd[],
): string {
  const opening = new RegExp(`<${tag}[^<>]*>`, 'gi');
  const endFinders = ends.map((end) =>
    typeof end === 'object' && !(end instanceof RegExp)
      ? { pattern: finder(end.before), before: true }
      : { pattern: finder(end), before: false },
  );

  let result = '';
  let copiedTo = 0;
  let match: RegExpExecArray | null;
  while ((match = opening.exec(html)) !== null) {
    if (!isStart(match[0])) continue;

    let position = opening.lastIndex;
    let complete = true;
    for (const end of endFinders) {
      end.pattern.lastIndex = position;
      const found = end.pattern.exec(html);
      if (!found) {
        complete = false;
        break;
      }
      position = end.before ? found.index : found.index + found[0].length;
    }
    if (!complete) break;

    result += html.slice(copiedTo, match.index);
    copiedTo = position;
    opening.lastIndex = position;
  }
  return copiedTo === 0 ? html : result + html.slice(copiedTo);
}

/**
 * Remove <script> and <noscript> elements. The end tag can have spaces or
 * attributes (</script >). After the removal, the "<" of any part of a
 * script tag that is left, for example from a nested
 * "<scr<script></script>ipt>", becomes "&lt;", so that no script tag stays.
 *
 * This is not an HTML sanitizer. It does not remove event handler
 * attributes (onerror=...) or javascript: URLs. Show the output in a
 * sandboxed iframe without allow-scripts.
 */
export function removeScripts(html: string): string {
  const withoutScripts = removeBlocks(html, 'script\\b', () => true, [/<\/script\b[^<>]*>/gi]);
  const withoutNoscripts = removeBlocks(withoutScripts, 'noscript\\b', () => true, [/<\/noscript\b[^<>]*>/gi]);
  return withoutNoscripts.replace(/<(\/?(?:no)?script)\b/gi, '&lt;$1');
}
