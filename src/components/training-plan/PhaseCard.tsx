'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
import type { Phase, PhaseColor } from '@/lib/training-plan-types'
import SegmentCard from './SegmentCard'

interface PhaseCardProps {
  phase: Phase
  phaseIndex: number
}

const PHASE_STYLES: Record<
  PhaseColor,
  { border: string; headerBg: string; headerText: string; goalText: string }
> = {
  blue: {
    border: 'border-l-blue-500',
    headerBg: 'bg-blue-50',
    headerText: 'text-blue-800',
    goalText: 'text-blue-600',
  },
  green: {
    border: 'border-l-green-500',
    headerBg: 'bg-green-50',
    headerText: 'text-green-800',
    goalText: 'text-green-600',
  },
  orange: {
    border: 'border-l-orange-500',
    headerBg: 'bg-orange-50',
    headerText: 'text-orange-800',
    goalText: 'text-orange-600',
  },
  purple: {
    border: 'border-l-purple-500',
    headerBg: 'bg-purple-50',
    headerText: 'text-purple-800',
    goalText: 'text-purple-600',
  },
}

export default function PhaseCard({ phase, phaseIndex }: PhaseCardProps) {
  const [isOpen, setIsOpen] = useState(true)
  const styles = PHASE_STYLES[phase.color] || PHASE_STYLES.blue

  return (
    <div
      className={`border-l-4 ${styles.border} rounded-xl overflow-hidden shadow-sm bg-white`}
    >
      {/* Phase Header */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`w-full flex items-start justify-between gap-3 px-5 py-4 ${styles.headerBg} hover:brightness-95 transition-all text-left`}
      >
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 mb-0.5`}>
            <span className={`text-base font-bold ${styles.headerText}`}>
              Phase {phaseIndex + 1}: {phase.name}
            </span>
          </div>
          <p className={`text-xs ${styles.goalText} leading-relaxed`}>{phase.goal}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 pt-0.5">
          <div className={`flex items-center gap-1 text-sm font-medium ${styles.headerText}`}>
            <Clock className="h-3.5 w-3.5" />
            <span>{phase.timeMinutes} min</span>
          </div>
          {isOpen ? (
            <ChevronUp className={`h-4 w-4 ${styles.headerText}`} />
          ) : (
            <ChevronDown className={`h-4 w-4 ${styles.headerText}`} />
          )}
        </div>
      </button>

      {/* Phase Body */}
      {isOpen && (
        <div className="p-4 space-y-3">
          {phase.segments.map((segment) => (
            <SegmentCard key={segment.id} segment={segment} />
          ))}
        </div>
      )}
    </div>
  )
}
