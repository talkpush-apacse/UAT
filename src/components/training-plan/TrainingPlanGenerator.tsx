'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  GraduationCap,
  Download,
  Printer,
  ClipboardCopy,
  FileCode2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CheckSquare,
  Square,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type {
  AudienceLevel,
  ModuleName,
  SessionDuration,
  TrainingFormValues,
  TrainingPlan,
} from '@/lib/training-plan-types'
import { MODULE_LIST, AUDIENCE_LEVEL_LABELS } from '@/lib/training-plan-types'
import { generateTrainingPlan } from '@/lib/training-plan-engine'
import {
  copyPlanAsMarkdown,
  downloadPlanAsHtml,
  printPlan,
} from '@/lib/training-plan-export'
import TimeBar from './TimeBar'
import PhaseCard from './PhaseCard'

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'tp-form-v1'

const DEFAULT_FORM: TrainingFormValues = {
  clientName: '',
  duration: 90,
  audienceLevel: 'beginner',
  modules: [],
  workflowJson: '',
  trainerName: '',
  trainingDate: new Date().toISOString().slice(0, 10),
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FormErrors = {
  clientName?: string
  trainerName?: string
  modules?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TrainingPlanGeneratorProps {
  companyName?: string
}

export default function TrainingPlanGenerator({ companyName }: TrainingPlanGeneratorProps) {
  const [form, setForm] = useState<TrainingFormValues>(DEFAULT_FORM)
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [workflowValid, setWorkflowValid] = useState<boolean | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<TrainingFormValues>
        setForm(prev => ({
          ...prev,
          ...parsed,
          // Always use the project's company name if provided
          clientName: companyName || parsed.clientName || '',
        }))
      } else if (companyName) {
        setForm(prev => ({ ...prev, clientName: companyName }))
      }
    } catch {
      if (companyName) {
        setForm(prev => ({ ...prev, clientName: companyName }))
      }
    }
  }, [companyName])

  // Save to localStorage whenever form changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    } catch {
      // localStorage unavailable — silently ignore
    }
  }, [form])

  // Validate workflow JSON on change
  useEffect(() => {
    if (!form.workflowJson.trim()) {
      setWorkflowValid(null)
      return
    }
    try {
      JSON.parse(form.workflowJson)
      setWorkflowValid(true)
    } catch {
      setWorkflowValid(false)
    }
  }, [form.workflowJson])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const updateField = useCallback(
    <K extends keyof TrainingFormValues>(field: K, value: TrainingFormValues[K]) => {
      setForm(prev => ({ ...prev, [field]: value }))
      if (errors[field as keyof FormErrors]) {
        setErrors(prev => ({ ...prev, [field]: undefined }))
      }
    },
    [errors]
  )

  const toggleModule = useCallback((mod: ModuleName) => {
    setForm(prev => {
      const current = prev.modules
      const updated = current.includes(mod)
        ? current.filter(m => m !== mod)
        : [...current, mod]
      return { ...prev, modules: updated }
    })
    setErrors(prev => ({ ...prev, modules: undefined }))
  }, [])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!form.clientName.trim()) newErrors.clientName = 'Client name is required'
    if (!form.trainerName.trim()) newErrors.trainerName = 'Trainer name is required'
    if (form.modules.length === 0) newErrors.modules = 'Select at least one module'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleGenerate = () => {
    if (!validate()) return
    setIsGenerating(true)

    // Generate synchronously but animate the reveal
    const newPlan = generateTrainingPlan(form)
    setPlan(newPlan)
    setIsAnimating(false)

    // Double rAF for smooth fade-in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(true)
        setIsGenerating(false)
        // Scroll to output
        document.getElementById('tp-output')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  }

  const handleReset = () => {
    setForm({
      ...DEFAULT_FORM,
      clientName: companyName || '',
    })
    setPlan(null)
    setErrors({})
    setWorkflowValid(null)
    setIsAnimating(false)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch { /* ignore */ }
  }

  const handleCopyMarkdown = async () => {
    if (!plan) return
    try {
      await copyPlanAsMarkdown(plan)
      toast.success('Copied to clipboard!')
    } catch {
      toast.error('Failed to copy — please try again')
    }
  }

  const handleDownloadHtml = () => {
    if (!plan) return
    try {
      downloadPlanAsHtml(plan)
      toast.success('HTML file downloaded!')
    } catch {
      toast.error('Download failed — please try again')
    }
  }

  const handlePrint = () => {
    if (!plan) return
    printPlan()
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const dateLabel = plan
    ? new Date(plan.metadata.date + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; max-width: 100% !important; flex: 1 !important; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* ── LEFT PANEL — Form ─────────────────────────────────────────── */}
        <div className="no-print w-full md:w-[360px] shrink-0 md:sticky md:top-8 md:max-h-[calc(100vh-8rem)] md:overflow-y-auto">
          <Card className="p-5 space-y-5">
            {/* Client Name */}
            <div className="space-y-1.5">
              <Label htmlFor="clientName" className="text-sm font-medium">
                Client Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="clientName"
                value={form.clientName}
                onChange={e => updateField('clientName', e.target.value)}
                placeholder="e.g., TaskUs Philippines"
                className={errors.clientName ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {errors.clientName && (
                <p className="text-xs text-red-500">{errors.clientName}</p>
              )}
            </div>

            {/* Session Duration */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Session Duration</Label>
              <RadioGroup
                value={String(form.duration)}
                onValueChange={v => updateField('duration', Number(v) as SessionDuration)}
                className="flex gap-4"
              >
                {([90, 120] as const).map(d => (
                  <div key={d} className="flex items-center gap-2">
                    <RadioGroupItem value={String(d)} id={`dur-${d}`} />
                    <Label htmlFor={`dur-${d}`} className="cursor-pointer text-sm font-normal">
                      {d} min
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Audience Level */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Audience Level</Label>
              <RadioGroup
                value={form.audienceLevel}
                onValueChange={v => updateField('audienceLevel', v as AudienceLevel)}
                className="space-y-1.5"
              >
                {(Object.entries(AUDIENCE_LEVEL_LABELS) as [AudienceLevel, string][]).map(
                  ([value, label]) => (
                    <div key={value} className="flex items-center gap-2">
                      <RadioGroupItem value={value} id={`aud-${value}`} />
                      <Label
                        htmlFor={`aud-${value}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {label}
                      </Label>
                    </div>
                  )
                )}
              </RadioGroup>
            </div>

            {/* Modules */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Modules to Cover <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-1">
                {MODULE_LIST.map(mod => {
                  const checked = form.modules.includes(mod)
                  return (
                    <label
                      key={mod}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => toggleModule(mod)}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        readOnly
                      />
                      {checked ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-300 group-hover:text-gray-400 shrink-0" />
                      )}
                      <span className="text-sm text-gray-700 leading-snug">{mod}</span>
                    </label>
                  )
                })}
              </div>
              {errors.modules && (
                <p className="text-xs text-red-500 px-1">{errors.modules}</p>
              )}
            </div>

            {/* Workflow JSON */}
            <div className="space-y-1.5">
              <Label htmlFor="workflowJson" className="text-sm font-medium">
                Workflow JSON{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="workflowJson"
                value={form.workflowJson}
                onChange={e => updateField('workflowJson', e.target.value)}
                placeholder="Paste your parsed workflow JSON here to personalize scenarios..."
                className="font-mono text-xs resize-none h-24"
              />
              {workflowValid === true && (
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Workflow loaded — scenarios will be personalized
                </div>
              )}
              {workflowValid === false && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <XCircle className="h-3.5 w-3.5" />
                  Invalid JSON — please check the format
                </div>
              )}
            </div>

            {/* Trainer Name */}
            <div className="space-y-1.5">
              <Label htmlFor="trainerName" className="text-sm font-medium">
                Trainer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="trainerName"
                value={form.trainerName}
                onChange={e => updateField('trainerName', e.target.value)}
                placeholder="e.g., Jane Smith"
                className={errors.trainerName ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {errors.trainerName && (
                <p className="text-xs text-red-500">{errors.trainerName}</p>
              )}
            </div>

            {/* Training Date */}
            <div className="space-y-1.5">
              <Label htmlFor="trainingDate" className="text-sm font-medium">
                Training Date
              </Label>
              <Input
                id="trainingDate"
                type="date"
                value={form.trainingDate}
                onChange={e => updateField('trainingDate', e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Training Plan'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-gray-400 hover:text-gray-600"
                onClick={handleReset}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset Form
              </Button>
            </div>
          </Card>
        </div>

        {/* ── RIGHT PANEL — Output ──────────────────────────────────────── */}
        <div
          id="tp-output"
          className="print-full flex-1 min-w-0"
        >
          {!plan ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-gray-200 rounded-xl text-center p-10">
              <GraduationCap className="h-12 w-12 text-gray-200 mb-4" />
              <p className="text-base font-medium text-gray-400 mb-1">
                No training plan yet
              </p>
              <p className="text-sm text-gray-300">
                Configure your session and click &ldquo;Generate Training Plan&rdquo;
              </p>
            </div>
          ) : (
            /* Plan output */
            <div
              className={`space-y-4 transition-opacity duration-500 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
            >
              {/* Sticky output header */}
              <div className="no-print sticky top-0 z-10 bg-white/95 backdrop-blur border border-gray-100 rounded-xl shadow-sm px-5 py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {plan.metadata.client}
                  </p>
                  <p className="text-xs text-gray-400">
                    {dateLabel} · {plan.metadata.duration} min ·{' '}
                    {AUDIENCE_LEVEL_LABELS[plan.metadata.audienceLevel]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-600 border-gray-200 hover:bg-gray-50"
                    onClick={handlePrint}
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Print
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCopyMarkdown}>
                        <ClipboardCopy className="h-3.5 w-3.5 mr-2" />
                        Copy as Markdown
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownloadHtml}>
                        <FileCode2 className="h-3.5 w-3.5 mr-2" />
                        Download as HTML
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Trimmed modules warning */}
              {plan.trimmedModules && plan.trimmedModules.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Some modules were trimmed to fit within {plan.metadata.duration} minutes
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Removed: {plan.trimmedModules.join(', ')}. Consider extending to a{' '}
                      {plan.metadata.duration === 90 ? '120' : '150'}-minute session or reducing
                      module count.
                    </p>
                  </div>
                </div>
              )}

              {/* Modules badges */}
              <div className="flex flex-wrap gap-1.5 px-1">
                {plan.metadata.modules.map(mod => (
                  <Badge
                    key={mod}
                    variant="outline"
                    className="text-xs text-emerald-700 border-emerald-200 bg-emerald-50"
                  >
                    {mod}
                  </Badge>
                ))}
              </div>

              {/* Time bar */}
              <TimeBar phases={plan.phases} totalMinutes={plan.totalMinutes} />

              {/* Phase cards */}
              <div className="space-y-4">
                {plan.phases.map((phase, idx) => (
                  <PhaseCard key={phase.name} phase={phase} phaseIndex={idx} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
