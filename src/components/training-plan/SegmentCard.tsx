'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Segment, SegmentType } from '@/lib/training-plan-types'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface SegmentCardProps {
  segment: Segment
}

const TYPE_STYLES: Record<
  SegmentType,
  { label: string; bg: string; text: string; border: string }
> = {
  icebreaker: {
    label: 'Icebreaker',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
  },
  lecture: {
    label: 'Lecture',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
  demo: {
    label: 'Demo',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
  },
  guided_exercise: {
    label: 'Guided Exercise',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  scenario: {
    label: 'Scenario',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
  knowledge_check: {
    label: 'Knowledge Check',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  debrief: {
    label: 'Debrief',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  handoff: {
    label: 'Handoff',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
}

export default function SegmentCard({ segment }: SegmentCardProps) {
  const [notesOpen, setNotesOpen] = useState(false)
  const typeStyle = TYPE_STYLES[segment.type] || TYPE_STYLES.lecture

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-start gap-2 px-4 py-3 border-b border-gray-50">
        <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-medium text-sm text-gray-900 leading-tight">
            {segment.title}
          </span>
          {segment.isPersonalized && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✨ Personalized
            </span>
          )}
          <span
            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
          >
            {typeStyle.label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0 pt-0.5">
          <Clock className="h-3 w-3" />
          <span>{segment.timeMinutes} min</span>
        </div>
      </div>

      {/* Trainer Script */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-xs font-semibold text-blue-600 mb-1.5">🎤 Say this:</p>
        <div className="bg-blue-50 rounded-lg px-3.5 py-2.5">
          <div className="prose prose-sm prose-blue max-w-none text-sm text-blue-900 leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ul]:pl-4 [&>li]:mb-0.5 [&>strong]:font-semibold [&>h4]:font-semibold [&>h4]:mt-2 [&>h4]:mb-1 [&>hr]:my-2 [&>hr]:border-blue-200">
            <ReactMarkdown>{segment.trainerScript}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Facilitator Notes — collapsible */}
      <div className="px-4 pb-3">
        <button
          onClick={() => setNotesOpen(v => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors py-1"
        >
          {notesOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          📋 Facilitator tip
        </button>

        {notesOpen && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3.5 py-2.5 mt-1">
            <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">
              {segment.trainerNotes}
            </p>
          </div>
        )}
      </div>

      {/* Materials */}
      {segment.materials && segment.materials.length > 0 && (
        <div className="px-4 pb-3 border-t border-gray-50 pt-2">
          <p className="text-xs font-semibold text-gray-500 mb-1">Materials:</p>
          <ul className="space-y-0.5">
            {segment.materials.map((m, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                <span className="text-gray-300 mt-0.5">•</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
