/* ------------------------------------------------------------------ */
/*  Actor types                                                        */
/* ------------------------------------------------------------------ */

export const ACTORS = ['Candidate', 'Talkpush', 'Recruiter', 'Referrer/Vendor'] as const
export type Actor = (typeof ACTORS)[number]

/** Light shade — used in badges, chips, and inline tags */
export const ACTOR_COLORS: Record<string, string> = {
  Candidate: "bg-sky-50 text-sky-800 border-sky-200",
  Talkpush: "bg-brand-sage-lightest text-brand-sage-darker border-brand-sage-lighter",
  Recruiter: "bg-violet-50 text-violet-800 border-violet-200",
  "Referrer/Vendor": "bg-amber-50 text-amber-800 border-amber-200",
} satisfies Record<Actor, string>

/** Medium shade — used in analytics and results badges */
export const ACTOR_COLORS_MEDIUM: Record<string, string> = {
  Candidate: "bg-sky-100 text-sky-800 border-sky-200",
  Talkpush: "bg-brand-sage-lightest text-brand-sage-darker border-brand-sage-lighter",
  Recruiter: "bg-violet-100 text-violet-800 border-violet-200",
  "Referrer/Vendor": "bg-amber-100 text-amber-800 border-amber-200",
} satisfies Record<Actor, string>

/* ------------------------------------------------------------------ */
/*  Client names                                                       */
/* ------------------------------------------------------------------ */

export const CLIENT_NAMES = [
  "Accenture",
  "Afni",
  "Alfamart",
  "Alorica",
  "Cognizant",
  "Concentrix",
  "EXL",
  "Inspiro",
  "Mcdonalds",
  "TaskUs",
  "WiPro",
] as const

export type ClientName = (typeof CLIENT_NAMES)[number]
