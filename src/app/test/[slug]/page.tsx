import { notFound } from "next/navigation"
import { createAnonSupabaseClient } from "@/lib/supabase/server"
import RegistrationForm from "@/components/tester/registration-form"
import MarkdownRenderer from "@/components/ui/markdown-renderer"

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
          <div className="rounded-2xl border-2 border-primary bg-white px-5 py-4">
            {project.title ? (
              <h2 className="mb-1.5 text-lg font-bold text-primary">
                {project.title}
              </h2>
            ) : (
              <p className="mb-2 text-lg font-bold text-primary">Test scenario</p>
            )}
            <MarkdownRenderer content={project.test_scenario} />
          </div>
        )}

        {project.test_scenario && (
          <p className="text-center text-sm font-medium text-gray-700">
            Enter your email below to begin — or pick up where you left off.
          </p>
        )}

        {/* Registration Form Card */}
        <div className="rounded-2xl border-2 border-primary bg-white px-6 py-6">
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
