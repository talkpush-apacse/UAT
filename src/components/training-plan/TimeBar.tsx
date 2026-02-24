import type { Phase } from '@/lib/training-plan-types'

interface TimeBarProps {
  phases: Phase[]
  totalMinutes: number
}

const PHASE_COLORS: Record<string, string> = {
  Connect: 'bg-blue-400',
  Explore: 'bg-green-400',
  Apply: 'bg-orange-400',
  Reflect: 'bg-purple-400',
}

const PHASE_TEXT_COLORS: Record<string, string> = {
  Connect: 'text-blue-700',
  Explore: 'text-green-700',
  Apply: 'text-orange-700',
  Reflect: 'text-purple-700',
}

export default function TimeBar({ phases, totalMinutes }: TimeBarProps) {
  return (
    <div className="mb-6">
      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-2">
        {phases.map((phase) => {
          const pct = (phase.timeMinutes / totalMinutes) * 100
          return (
            <div
              key={phase.name}
              className={`${PHASE_COLORS[phase.name] || 'bg-gray-400'} rounded-full`}
              style={{ width: `${pct}%` }}
              title={`${phase.name}: ${phase.timeMinutes} min`}
            />
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {phases.map((phase) => {
          const pct = Math.round((phase.timeMinutes / totalMinutes) * 100)
          return (
            <div key={phase.name} className="flex items-center gap-1.5 text-xs">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-sm ${PHASE_COLORS[phase.name] || 'bg-gray-400'}`}
              />
              <span className={`font-medium ${PHASE_TEXT_COLORS[phase.name] || 'text-gray-600'}`}>
                {phase.name}
              </span>
              <span className="text-gray-400">
                {phase.timeMinutes} min ({pct}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
