"use client"

import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"

export default function MarkdownRenderer({
  content,
  className = "",
}: {
  content: string
  className?: string
}) {
  return (
    <div className={`prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-a:text-brand-sage-darker prose-strong:text-gray-900 prose-li:my-0.5 ${className}`}>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
