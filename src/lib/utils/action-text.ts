/**
 * Pure helpers for the free-text "action" of a checklist step.
 * (No regex lookbehind: older iOS Safari throws a SyntaxError on it, which
 * would take down the whole tester page.)
 */

// "Expected:" at the start of the text, a line, or right after a sentence end.
const EXPECTED_LABEL_SOURCE = "(^|\\n|[.!?:)'\"’”\\]]\\s+)(Expected(?:\\s+(?:result|outcome))?s?\\s*:)"

/**
 * Splits "…Submit the form. Expected: the page shows X." into the instructions
 * and the expected result, so the result can be shown as its own block.
 * Uses the last "Expected:" label. Returns `expected: null` when there is no
 * label, or nothing before / after it (then the text is shown unchanged).
 */
export function splitExpected(text: string): { main: string; expected: string | null } {
  let split: { mainEnd: number; expectedStart: number } | null = null
  const label = new RegExp(EXPECTED_LABEL_SOURCE, "gi")
  let m: RegExpExecArray | null
  while ((m = label.exec(text)) !== null) {
    const mainEnd = m.index + m[1].length
    split = { mainEnd, expectedStart: mainEnd + m[2].length }
  }
  if (!split) return { main: text, expected: null }

  const main = text.slice(0, split.mainEnd).trim()
  const expected = text.slice(split.expectedStart).trim()
  if (!main || !expected) return { main: text, expected: null }
  return { main, expected }
}

const LIST_LINE = /^\s*(?:\d+[.)]|[-*+])\s/m
const ABBREVIATION_END = /(?:\be\.g|\bi\.e|\betc|\bvs|\bno|\bapprox|\bmr|\bmrs|\bdr)\.$/i
// Sentence end followed by a capital, digit, quote or bracket starting the next one.
const SENTENCE_BREAK = /([.!?]['")\]’”]*)\s+(?=[A-Z0-9'"“‘(\[*_])/g
const NUL = "\u0000"

/**
 * Turns one long paragraph of instructions into a numbered list, one sentence
 * per item, keeping any "Expected:" part as its own paragraph underneath.
 * Returns null when there is nothing safe to do (already structured, or fewer
 * than 3 sentences) so the caller can disable the button instead of guessing.
 */
export function splitIntoSteps(text: string): string | null {
  const { main, expected } = splitExpected(text)
  if (/\n/.test(main) || LIST_LINE.test(main)) return null

  // Hide URLs and markdown links so their dots and parentheses never split a sentence.
  const stash: string[] = []
  const hidden = main
    .replace(/\[[^\]]*\]\([^)]*\)|https?:\/\/[^\s<>"]+/g, (m) => {
      // "see https://x.com/a." — the final full stop belongs to the sentence, not the URL.
      const trailing = m.startsWith("http") ? (m.match(/[.,;:!?)\]]+$/)?.[0] ?? "") : ""
      stash.push(trailing ? m.slice(0, -trailing.length) : m)
      return `§${stash.length - 1}§${trailing}`
    })
    .replace(SENTENCE_BREAK, `$1${NUL}`)

  const parts: string[] = []
  for (const piece of hidden.split(NUL)) {
    const prev = parts[parts.length - 1]
    if (prev !== undefined && ABBREVIATION_END.test(prev)) parts[parts.length - 1] = `${prev} ${piece}`
    else parts.push(piece)
  }

  const items = parts
    .map((p) =>
      p
        .replace(/§(\d+)§/g, (_, i) => stash[Number(i)])
        // "…link . Next sentence" typed with a stray space before the full stop
        .replace(/\s+([.!?])$/, "$1")
        .trim()
    )
    .filter(Boolean)
  if (items.length < 3) return null

  const list = items.map((item, i) => `${i + 1}. ${item}`).join("\n")
  return expected ? `${list}\n\nExpected: ${expected}` : list
}
