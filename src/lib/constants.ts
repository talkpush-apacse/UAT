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
