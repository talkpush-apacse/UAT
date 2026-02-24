export type AudienceLevel = 'beginner' | 'some_exposure' | 'refresher'
export type SessionDuration = 90 | 120
export type SegmentType =
  | 'icebreaker'
  | 'lecture'
  | 'demo'
  | 'guided_exercise'
  | 'scenario'
  | 'knowledge_check'
  | 'debrief'
  | 'handoff'
export type PhaseColor = 'blue' | 'green' | 'orange' | 'purple'

export const MODULE_LIST = [
  'Sourcing',
  'Campaign Structure',
  'Chatbot / Screening',
  'Manual Screening',
  'Interview Scheduling',
  'Offers & Dispositions',
  'Reporting & Analytics',
  'Integrations',
] as const

export type ModuleName = (typeof MODULE_LIST)[number]

// Highest priority first — used to trim when modules exceed time budget
export const MODULE_PRIORITY: ModuleName[] = [
  'Sourcing',
  'Campaign Structure',
  'Chatbot / Screening',
  'Manual Screening',
  'Interview Scheduling',
  'Offers & Dispositions',
  'Reporting & Analytics',
  'Integrations',
]

export const AUDIENCE_LEVEL_LABELS: Record<AudienceLevel, string> = {
  beginner: 'Total Beginner',
  some_exposure: 'Some Exposure',
  refresher: 'Refresher',
}

export interface TrainingFormValues {
  clientName: string
  duration: SessionDuration
  audienceLevel: AudienceLevel
  modules: ModuleName[]
  workflowJson: string
  trainerName: string
  trainingDate: string
}

export interface Segment {
  id: string
  title: string
  timeMinutes: number
  type: SegmentType
  trainerScript: string // markdown
  trainerNotes: string
  materials?: string[]
  isPersonalized?: boolean
}

export interface Phase {
  name: string // Connect | Explore | Apply | Reflect
  goal: string
  timeMinutes: number
  color: PhaseColor
  segments: Segment[]
}

export interface TrainingPlan {
  metadata: {
    client: string
    trainer: string
    date: string
    duration: SessionDuration
    audienceLevel: AudienceLevel
    modules: ModuleName[]
  }
  phases: Phase[]
  totalMinutes: number
  trimmedModules?: ModuleName[]
}

export interface ParsedWorkflow {
  name?: string
  folders?: string[]
  steps?: Array<{
    label?: string
    text?: string
    step_type?: string
    path?: string
    destination_folder?: string
    trigger_folder?: string
    actor?: string
    action?: string
    comm_channel?: string
    candidate_experience?: string
  }>
}
