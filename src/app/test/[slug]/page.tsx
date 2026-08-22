import { notFound } from "next/navigation"
import { createAnonSupabaseClient } from "@/lib/supabase/server"
import RegistrationForm from "@/components/tester/registration-form"
import MarkdownRenderer from "@/components/ui/markdown-renderer"
import { ClipboardList } from "lucide-react"

export default async function TesterRegistrationPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createAnonSupabaseClient()

  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, company_name, title, test_scenario, country, client:clients(logo_url)")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-brand-sage-lightest to-background flex flex-col items-center justify-center px-4 py-8">
      {/* Talkpush Sign brand gradient strip */}
      <div className="fixed top-0 left-0 right-0 h-1.5 brand-gradient-strip z-10" />
      <div className="w-full max-w-md space-y-5">

        {/* UAT Checklist Logo */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/uat-isolated-monogram.svg"
            alt="UAT Checklist"
            className="h-14 w-auto"
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
            <MarkdownRenderer content={project.test_scenario} />
          </div>
        )}

        {project.test_scenario && (
          <p className="text-sm text-gray-500 text-center">
            Please fill in your details below to begin the UAT steps.
          </p>
        )}

        {/* Registration Form Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md px-6 py-6">
          <RegistrationForm
            projectId={project.id}
            slug={project.slug}
            companyName={project.company_name}
            country={project.country}
            clientLogoUrl={project.client?.logo_url}
          />
        </div>

      </div>
    </div>
  )
}
