"use client"

import { useFormState } from "react-dom"
import { loginAdmin, type AuthState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { LayoutDashboard } from "lucide-react"

const initialState: AuthState = {}

export default function AdminLoginPage() {
  const [state, formAction] = useFormState(loginAdmin, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">UAT Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to manage your projects</p>
        </div>

        <Card className="border-gray-200 shadow-md">
          <CardContent className="pt-6">
            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-gray-500">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter admin password"
                  required
                  autoFocus
                  className="h-10"
                />
              </div>
              {state.error && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}
              <Button type="submit" className="w-full h-10">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
