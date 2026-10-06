"use client"

import { Children, Fragment, useState, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import { Check, Copy } from "lucide-react"

const URL_SPLIT = /(https?:\/\/[^\s<>"]+)/g
// Sentence punctuation that ends up glued to a pasted URL ("see https://x.com/a.")
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/
// Above this many characters a URL is shown shortened, with a Copy button.
const MAX_LABEL_LENGTH = 48

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
function UrlLink({ url, linkClassName }: { url: string; linkClassName: string }) {
  const { label, truncated } = shortenUrl(url)
  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={url}
        className={`${linkClassName} underline underline-offset-2 [overflow-wrap:anywhere]`}
      >
        {truncated ? label : url}
      </a>
      {truncated && <CopyLinkButton url={url} />}
    </>
  )
}

/** Turns bare http(s) URLs inside plain-text children into links. */
function linkify(children: ReactNode, linkClassName: string): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child !== "string") return child
    // split() with a capture group puts every URL at an odd index.
    return child.split(URL_SPLIT).map((part, i) => {
      if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>
      const trailing = part.match(TRAILING_PUNCTUATION)?.[0] ?? ""
      const url = trailing ? part.slice(0, -trailing.length) : part
      return (
        <Fragment key={i}>
          <UrlLink url={url} linkClassName={linkClassName} />
          {trailing}
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
 */
export default function RichText({
  children,
  className = "",
  linkClassName = "text-brand-sage-darker",
}: {
  children: string
  className?: string
  linkClassName?: string
}) {
  return (
    <div
      className={`min-w-0 [overflow-wrap:anywhere] [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_img]:max-w-full ${className}`}
    >
      <ReactMarkdown
        rehypePlugins={[rehypeSanitize]}
        components={{
          p: ({ children }) => <p>{linkify(children, linkClassName)}</p>,
          li: ({ children }) => <li>{linkify(children, linkClassName)}</li>,
          a: ({ href, children }) => {
            if (!href) return <>{children}</>
            // [https://…](https://…) or <https://…>: the label is the URL, so shorten it.
            const text = nodeText(children)
            if (text && text === href) return <UrlLink url={href} linkClassName={linkClassName} />
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
