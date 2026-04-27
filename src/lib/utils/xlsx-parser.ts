import ExcelJS from 'exceljs'
import { ACTORS } from '@/lib/constants'

export interface ParsedChecklistItem {
  stepNumber: number | null
  path: string | null
  actor: string
  action: string
  viewSample: string | null
  crmModule: string | null
  tip: string | null
  sortOrder: number
  itemType?: 'step' | 'phase_header'
  headerLabel?: string | null
}

interface ParseResult {
  items: ParsedChecklistItem[]
  errors: string[]
}

const VALID_ACTORS: readonly string[] = ACTORS

function normalizePath(value: string): string | null {
  const cleaned = value.trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (cleaned === 'happy') return 'Happy'
  if (cleaned === 'nonhappy') return 'Non-Happy'
  return null // unrecognized
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function findColumnIndex(
  headers: string[],
  ...candidates: string[]
): number | null {
  for (const candidate of candidates) {
    const normalized = normalizeHeader(candidate)
    const idx = headers.findIndex((h) => normalizeHeader(h) === normalized)
    if (idx !== -1) return idx
  }
  return null
}

export async function parseChecklistFile(
  buffer: Buffer,
  fileName: string
): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  const errors: string[] = []
  const items: ParsedChecklistItem[] = []

  const isCSV = fileName.toLowerCase().endsWith('.csv')

  if (isCSV) {
    const { Readable } = await import('stream')
    const stream = new Readable()
    stream.push(buffer)
    stream.push(null)
    await workbook.csv.read(stream)
  } else {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  }

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return { items: [], errors: ['No worksheet found in the file'] }
  }

  // Get headers from first row
  const headerRow = worksheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || '').trim()
  })

  if (headers.length === 0) {
    return { items: [], errors: ['No headers found in the first row'] }
  }

  // Map columns
  const stepCol = findColumnIndex(headers, 'Step', 'Step Number', 'StepNumber', '#')
  const pathCol = findColumnIndex(headers, 'Path')
  const actorCol = findColumnIndex(headers, 'Actor', 'Tester Perspective')
  const actionCol = findColumnIndex(headers, 'Action', 'Description', 'Test Step')
  const sampleCol = findColumnIndex(headers, 'View Sample', 'Sample', 'ViewSample', 'Link')
  const moduleCol = findColumnIndex(headers, 'CRM Module', 'CRMModule', 'Module')
  const tipCol = findColumnIndex(headers, 'Tip', 'Tips', 'Hint', 'Hints', 'Helper')
  // Optional columns for phase headers
  const typeCol = findColumnIndex(headers, 'Type', 'Item Type', 'ItemType')
  const headerLabelCol = findColumnIndex(headers, 'Header Label', 'HeaderLabel', 'Phase', 'Phase Label')

  if (actionCol === null) {
    return {
      items: [],
      errors: ['Required column "Action" not found. Expected columns: Step, Path, Tester Perspective, Action, View Sample, CRM Module (optional: Type, Header Label)'],
    }
  }
  // Actor is only required if there are non-header rows. We validate per-row below.

  let sortOrder = 0

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return // Skip header

    const getCellValue = (colIndex: number | null): string => {
      if (colIndex === null) return ''
      const cell = row.getCell(colIndex + 1)
      return String(cell.value || '').trim()
    }

    const action = getCellValue(actionCol)
    if (!action) return // Skip empty rows

    sortOrder++

    // Determine item type. Default to 'step' for backwards-compat with sheets
    // that don't include a Type column.
    const typeRaw = getCellValue(typeCol).toLowerCase().replace(/[\s_-]+/g, '')
    const itemType: 'step' | 'phase_header' =
      typeRaw === 'phaseheader' || typeRaw === 'header' || typeRaw === 'phase'
        ? 'phase_header'
        : 'step'
    const isHeader = itemType === 'phase_header'

    const stepStr = getCellValue(stepCol)
    let stepNumber: number | null
    if (isHeader) {
      // Phase headers don't carry a step number — even if the sheet provides one,
      // the renumber RPC will set it to NULL on insert.
      stepNumber = null
    } else {
      stepNumber = stepStr ? parseInt(stepStr, 10) : sortOrder
      if (stepNumber !== null && isNaN(stepNumber)) {
        errors.push(`Row ${rowNumber}: Invalid step number "${stepStr}"`)
        return
      }
    }

    let actor = getCellValue(actorCol)
    if (isHeader) {
      // Headers don't need a real actor, but the column has a NOT NULL constraint.
      // Use the placeholder the rest of the codebase uses for header rows.
      if (!actor || !VALID_ACTORS.includes(actor)) actor = 'Talkpush'
    } else if (!VALID_ACTORS.includes(actor)) {
      errors.push(
        `Row ${rowNumber}: Invalid actor "${actor}". Must be one of: ${VALID_ACTORS.join(', ')}`
      )
      return
    }

    const pathValue = getCellValue(pathCol)
    let path: string | null = null
    if (!isHeader && pathValue) {
      const normalized = normalizePath(pathValue)
      if (normalized) {
        path = normalized
      } else {
        errors.push(
          `Row ${rowNumber}: Invalid path "${pathValue}". Must be "Happy" or "Non-Happy"`
        )
        return
      }
    }

    const viewSample = isHeader ? null : getCellValue(sampleCol) || null
    const crmModule = isHeader ? null : getCellValue(moduleCol) || null
    const tip = getCellValue(tipCol) || null
    const headerLabel = isHeader ? getCellValue(headerLabelCol) || null : null

    items.push({
      stepNumber,
      path,
      actor,
      action,
      viewSample,
      crmModule,
      tip,
      sortOrder,
      itemType,
      headerLabel,
    })
  })

  return { items, errors }
}

