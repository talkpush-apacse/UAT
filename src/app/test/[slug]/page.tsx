import { notFound } from "next/navigation"
import { createAnonSupabaseClient } from "@/lib/supabase/server"
import RegistrationForm from "@/components/tester/registration-form"
import { ClipboardList } from "lucide-react"
import ReactMarkdown from "react-markdown"

export default async function TesterRegistrationPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createAnonSupabaseClient()

  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, company_name, title, test_scenario, country")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-sage-lightest to-gray-50 flex flex-col items-center justify-center px-4 py-8">
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
          <div className="bg-white rounded-2xl border border-brand-sage-lighter shadow-sm px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="h-4 w-4 text-brand-sage-darker flex-shrink-0" />
              <p className="text-xs font-semibold text-brand-sage-darker uppercase tracking-wide">
                Test Scenario
              </p>
            </div>
            {project.title && (
              <h2 className="text-base font-semibold text-gray-900 mb-1.5">
                {project.title}
              </h2>
            )}
            <div className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-a:text-brand-sage-darker prose-strong:text-gray-900 prose-li:my-0.5 prose-p:my-1">
              <ReactMarkdown>{project.test_scenario}</ReactMarkdown>
            </div>
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
            country={project.country}
          />
        </div>

      </div>
    </div>
  )
}
