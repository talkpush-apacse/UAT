import { notFound } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import RegistrationForm from "@/components/tester/registration-form"
import { ClipboardList } from "lucide-react"

export default async function TesterRegistrationPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createServerSupabaseClient()

  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, company_name, test_scenario")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-5">

        {/* Talkpush Logo */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://assets-global.website-files.com/5e6c01bb5212506d6c119069/5e6c01bb52125004cd119121_Talkpush%20-%20Logo%20-%20Color.svg"
            alt="Talkpush"
            className="h-9 w-auto"
          />
        </div>

        {/* Test Scenario Card */}
        {project.test_scenario && (
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                Test Scenario
              </p>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {project.test_scenario}
            </p>
          </div>
        )}

        {/* Registration Form Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md px-6 py-6">
          <RegistrationForm
            projectId={project.id}
            slug={project.slug}
            companyName={project.company_name}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          Powered by Talkpush UAT
        </p>
      </div>
    </div>
  )
}
