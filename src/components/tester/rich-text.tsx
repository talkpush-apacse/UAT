"use client"

import { Children, Fragment, useState, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import { AlertTriangle, Check, Copy, ExternalLink } from "lucide-react"

const URL_SPLIT = /(https?:\/\/[^\s<>"]+)/g
// Sentence punctuation that ends up glued to a pasted URL ("see https://x.com/a.")
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/
// Above this many characters a URL is shown shortened, with a Copy button.
const MAX_LABEL_LENGTH = 48

/** Boxed, button-like link style used for the one main link of a step. */
const BUTTON_LINK =
  "inline-flex max-w-full items-center gap-1.5 rounded-lg border-2 border-primary bg-white px-2.5 py-1 align-middle font-bold text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [overflow-wrap:anywhere]"

/** The first http(s) URL in a piece of text, without sentence punctuation glued to its end. */
export function firstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"]+/)
  return m ? m[0].replace(TRAILING_PUNCTUATION, "") : null
}

/** "https://host/very/long/path?x=1" -> "host/very/long/path?x=…" (the full URL stays in the href). */
function shortenUrl(url: string): { label: string; truncated: boolean } {
  let label = url
  try {
    const { host, pathname, search, hash } = new URL(url)
    label = `${host}${pathname === "/" ? "" : pathname}${search}${hash}`
  } catch {
    // Not parseable — fall through and truncate the raw string.
  }
  const truncated = label.length > MAX_LABEL_LENGTH
  return { label: truncated ? `${label.slice(0, MAX_LABEL_LENGTH - 1)}…` : label, truncated }
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (insecure context / permissions) — the link itself still works.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Link copied" : "Copy full link"}
      title={copied ? "Copied" : "Copy full link"}
      className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded align-middle text-current opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lavender-darker"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

/**
 * A link whose visible text is the URL itself. Long URLs are shortened for
 * display; the href, tooltip and Copy button keep the full address.
 */
export function UrlLink({
  url,
  linkClassName,
  button = false,
  after,
}: {
  url: string
  linkClassName: string
  /** Show as a boxed, button-like link (the step's main call to action). */
  button?: boolean
  /** Punctuation that followed the URL in the text; kept next to the link, before the Copy button. */
  after?: ReactNode
}) {
  const { label, truncated } = shortenUrl(url)
  const link = (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className={
        button ? `${BUTTON_LINK} min-w-0` : `${linkClassName} underline underline-offset-2 [overflow-wrap:anywhere]`
      }
    >
      {truncated ? label : url}
      {button && <ExternalLink className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
    </a>
  )
  // The button and its Copy icon stay together on one line, even on a phone.
  if (button) {
    return (
      <span className="inline-flex max-w-full items-center gap-1 align-middle">
        {link}
        {after}
        {truncated && <CopyLinkButton url={url} />}
      </span>
    )
  }
  return (
    <>
      {link}
      {after}
      {truncated && <CopyLinkButton url={url} />}
    </>
  )
}

/** Turns bare http(s) URLs inside plain-text children into links. */
function linkify(children: ReactNode, linkClassName: string, primaryUrl: string | null): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child !== "string") return child
    // split() with a capture group puts every URL at an odd index.
    return child.split(URL_SPLIT).map((part, i) => {
      if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>
      const trailing = part.match(TRAILING_PUNCTUATION)?.[0] ?? ""
      const url = trailing ? part.slice(0, -trailing.length) : part
      return (
        <Fragment key={i}>
          <UrlLink
            url={url}
            linkClassName={linkClassName}
            button={url === primaryUrl}
            // A full stop after a button reads as a stray dot; closing brackets and the like stay.
            after={url === primaryUrl ? trailing.replace(/^[.,;:]+/, "") : trailing}
          />
        </Fragment>
      )
    })
  })
}

function nodeText(children: ReactNode): string | null {
  const arr = Children.toArray(children)
  return arr.length === 1 && typeof arr[0] === "string" ? arr[0] : null
}

/**
 * Markdown for tester-facing instructions and tips. Guarantees that long
 * URLs and unbroken strings wrap inside their card instead of widening the page.
 *
 * Lines starting with ">" render as a red "important" callout.
 * With `highlightFirstLink`, the first link in the text is shown as a button.
 */
export default function RichText({
  children,
  className = "",
  linkClassName = "text-brand-sage-darker",
  highlightFirstLink = false,
}: {
  children: string
  className?: string
  linkClassName?: string
  highlightFirstLink?: boolean
}) {
  const primaryUrl = highlightFirstLink ? firstUrl(children) : null
  return (
    <div
      className={`min-w-0 [overflow-wrap:anywhere] [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_img]:max-w-full ${className}`}
    >
      <ReactMarkdown
        rehypePlugins={[rehypeSanitize]}
        components={{
          p: ({ children }) => <p>{linkify(children, linkClassName, primaryUrl)}</p>,
          li: ({ children }) => <li>{linkify(children, linkClassName, primaryUrl)}</li>,
          blockquote: ({ children }) => (
            <div
              role="note"
              className="my-3 flex gap-2.5 rounded-lg border-2 border-red-700 bg-red-50 px-3 py-2.5 text-red-900 [&_p]:my-0"
            >
              <AlertTriangle className="mt-1 h-4 w-4 flex-shrink-0 text-red-700" aria-hidden="true" />
              <div className="min-w-0">
                <span className="sr-only">Important: </span>
                {children}
              </div>
            </div>
          ),
          a: ({ href, children }) => {
            if (!href) return <>{children}</>
            // [https://…](https://…) or <https://…>: the label is the URL, so shorten it.
            const text = nodeText(children)
            if (text && text === href) {
              return <UrlLink url={href} linkClassName={linkClassName} button={href === primaryUrl} />
            }
            if (href === primaryUrl) {
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" className={BUTTON_LINK}>
                  {children}
                  <ExternalLink className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                </a>
              )
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkClassName} underline underline-offset-2`}
              >
                {children}
              </a>
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
