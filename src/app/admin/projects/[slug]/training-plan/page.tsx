export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/utils/admin-auth'
import { ArrowLeft } from 'lucide-react'
import TrainingPlanGenerator from '@/components/training-plan/TrainingPlanGenerator'

export default async function TrainingPlanPage({
  params,
}: {
  params: { slug: string }
}) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect('/admin/login')

  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, slug, company_name')
    .eq('slug', params.slug)
    .single()

  if (!project) notFound()

  return (
    <div>
      <Link
        href={`/admin/projects/${project.slug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-700 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {project.company_name}
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Training Plan Generator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate a structured, timed recruiter onboarding plan for{' '}
          <span className="font-medium text-gray-700">{project.company_name}</span>
        </p>
      </div>

      <TrainingPlanGenerator companyName={project.company_name} />
    </div>
  )
}
