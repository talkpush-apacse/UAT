import { notFound } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import RegistrationForm from "@/components/tester/registration-form"

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{project.company_name}</CardTitle>
          <CardDescription>UAT Checklist</CardDescription>
          {project.test_scenario && (
            <p className="text-sm text-muted-foreground mt-2">
              {project.test_scenario}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Please enter your details to start the checklist. If you have already registered,
            enter the same email or mobile to resume.
          </p>
          <RegistrationForm projectId={project.id} slug={project.slug} />
        </CardContent>
      </Card>
    </div>
  )
}
