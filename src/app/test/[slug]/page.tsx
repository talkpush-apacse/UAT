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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-5">

        {/* Talkpush Logo */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/talkpush-logo.svg"
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

        {project.test_scenario && (
          <p className="text-sm text-gray-500 text-center">
            Please fill in your details below to begin the checklist.
          </p>
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
        <p className="text-center text-xs text-gray-500">
          Powered by Talkpush UAT
        </p>
      </div>
    </div>
  )
}
