import { redirect } from "next/navigation"
import {
  verifyAdminSession,
  verifyAdminPassword,
  createAdminSession,
} from "@/lib/utils/admin-auth"
import { getClient, createAuthorizationCode } from "@/lib/oauth/store"
import { GoogleSignInButton } from "./google-sign-in-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, LayoutDashboard } from "lucide-react"

interface PageProps {
  searchParams: {
    response_type?: string
    client_id?: string
    redirect_uri?: string
    code_challenge?: string
    code_challenge_method?: string
    state?: string
    resource?: string
    scope?: string
    auth_error?: string
  }
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 px-4">
      <Card className="w-full max-w-md border-red-200">
        <CardContent className="pt-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">{title}</h1>
          <p className="text-sm text-gray-500">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function OAuthAuthorizePage({ searchParams }: PageProps) {
  const {
    response_type: responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    state,
    resource,
    scope,
    auth_error: authError,
  } = searchParams

  if (responseType !== "code") {
    return (
      <ErrorScreen
        title="Unsupported request"
        message="Only the authorization code flow is supported."
      />
    )
  }
  if (!clientId || !redirectUri || !codeChallenge) {
    return <ErrorScreen title="Invalid request" message="Missing required OAuth parameters." />
  }

  const client = await getClient(clientId)
  if (!client || !client.redirect_uris.includes(redirectUri)) {
    return (
      <ErrorScreen
        title="Unknown connector"
        message="This connector isn't registered, or its redirect URL doesn't match what was registered."
      />
    )
  }

  // From here on redirect_uri is trusted (it matched the client's registered
  // list), so further validation failures can be safely reported back to the
  // client via redirect instead of a local error page.
  if (codeChallengeMethod !== "S256") {
    const params = new URLSearchParams({ error: "invalid_request" })
    if (state) params.set("state", state)
    redirect(`${redirectUri}?${params.toString()}`)
  }

  // Re-bind as explicit `string` locals: narrowing from the guards above
  // doesn't survive into the nested server-action closures below.
  const safeClientId: string = clientId
  const safeRedirectUri: string = redirectUri
  const safeCodeChallenge: string = codeChallenge
  const safeCodeChallengeMethod: string = codeChallengeMethod

  const qs = new URLSearchParams()
  qs.set("response_type", responseType)
  qs.set("client_id", safeClientId)
  qs.set("redirect_uri", safeRedirectUri)
  qs.set("code_challenge", safeCodeChallenge)
  qs.set("code_challenge_method", safeCodeChallengeMethod)
  if (state) qs.set("state", state)
  if (resource) qs.set("resource", resource)
  if (scope) qs.set("scope", scope)
  const returnUrl = `/oauth/authorize?${qs.toString()}`

  const isAuthed = await verifyAdminSession()

  async function loginAction(formData: FormData) {
    "use server"
    const password = String(formData.get("password") ?? "")
    if (!verifyAdminPassword(password)) {
      redirect(`${returnUrl}&auth_error=1`)
    }
    await createAdminSession()
    redirect(returnUrl)
  }

  async function decisionAction(formData: FormData) {
    "use server"
    const decision = String(formData.get("decision") ?? "")

    if (!(await verifyAdminSession())) {
      redirect(returnUrl)
    }

    if (decision !== "approve") {
      const params = new URLSearchParams({ error: "access_denied" })
      if (state) params.set("state", state)
      redirect(`${safeRedirectUri}?${params.toString()}`)
    }

    const code = await createAuthorizationCode({
      clientId: safeClientId,
      redirectUri: safeRedirectUri,
      codeChallenge: safeCodeChallenge,
      codeChallengeMethod: safeCodeChallengeMethod,
      resource,
      scope,
    })

    const params = new URLSearchParams({ code })
    if (state) params.set("state", state)
    redirect(`${safeRedirectUri}?${params.toString()}`)
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Sign in to continue</h1>
            <p className="text-sm text-gray-500 mt-1">
              {client.client_name || "A connector"} wants to access your UAT Talkpush data
            </p>
          </div>
          <Card className="border-gray-200 shadow-md">
            <CardContent className="pt-6">
              <form action={loginAction} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs text-gray-500">
                    Admin password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoFocus
                    className="h-10"
                  />
                </div>
                {authError && <p className="text-sm text-red-600">Incorrect password</p>}
                <Button type="submit" className="w-full h-10">
                  Sign in
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-500">or</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <GoogleSignInButton returnUrl={returnUrl} />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Authorize connector</h1>
        </div>
        <Card className="border-gray-200 shadow-md">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{client.client_name || "An unnamed connector"}</span>{" "}
              is requesting access to UAT Talkpush. If approved, it will have the same
              level of access as an admin — full read/write on all UAT projects, checklists,
              and tester data.
            </p>
            <p className="text-xs text-gray-500">
              Access will be sent to:{" "}
              <span className="font-mono break-all">{new URL(safeRedirectUri).origin}</span>
            </p>
            <div className="flex gap-3">
              <form action={decisionAction} className="flex-1">
                <input type="hidden" name="decision" value="deny" />
                <Button type="submit" variant="outline" className="w-full h-10">
                  Deny
                </Button>
              </form>
              <form action={decisionAction} className="flex-1">
                <input type="hidden" name="decision" value="approve" />
                <Button type="submit" className="w-full h-10">
                  Approve
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
