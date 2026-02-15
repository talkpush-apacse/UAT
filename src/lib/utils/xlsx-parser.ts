import ExcelJS from 'exceljs'

export interface ParsedChecklistItem {
  stepNumber: number
  path: string | null
  actor: string
  action: string
  viewSample: string | null
  crmModule: string | null
  sortOrder: number
}

interface ParseResult {
  items: ParsedChecklistItem[]
  errors: string[]
}

const VALID_ACTORS = ['Candidate', 'Talkpush', 'Recruiter']
const VALID_PATHS = ['Happy', 'Non-Happy']

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
  const actorCol = findColumnIndex(headers, 'Actor')
  const actionCol = findColumnIndex(headers, 'Action', 'Description', 'Test Step')
  const sampleCol = findColumnIndex(headers, 'View Sample', 'Sample', 'ViewSample', 'Link')
  const moduleCol = findColumnIndex(headers, 'CRM Module', 'CRMModule', 'Module')

  if (actionCol === null) {
    return {
      items: [],
      errors: ['Required column "Action" not found. Expected columns: Step, Path, Actor, Action, View Sample, CRM Module'],
    }
  }
  if (actorCol === null) {
    return {
      items: [],
      errors: ['Required column "Actor" not found. Expected columns: Step, Path, Actor, Action, View Sample, CRM Module'],
    }
  }

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

    const stepStr = getCellValue(stepCol)
    const stepNumber = stepStr ? parseInt(stepStr, 10) : sortOrder
    if (isNaN(stepNumber)) {
      errors.push(`Row ${rowNumber}: Invalid step number "${stepStr}"`)
      return
    }

    const actor = getCellValue(actorCol)
    if (!VALID_ACTORS.includes(actor)) {
      errors.push(
        `Row ${rowNumber}: Invalid actor "${actor}". Must be one of: ${VALID_ACTORS.join(', ')}`
      )
      return
    }

    const pathValue = getCellValue(pathCol)
    let path: string | null = null
    if (pathValue) {
      if (VALID_PATHS.includes(pathValue)) {
        path = pathValue
      } else {
        errors.push(
          `Row ${rowNumber}: Invalid path "${pathValue}". Must be "Happy" or "Non-Happy"`
        )
        return
      }
    }

    const viewSample = getCellValue(sampleCol) || null
    const crmModule = getCellValue(moduleCol) || null

    items.push({
      stepNumber,
      path,
      actor,
      action,
      viewSample,
      crmModule,
      sortOrder,
    })
  })

  return { items, errors }
}

