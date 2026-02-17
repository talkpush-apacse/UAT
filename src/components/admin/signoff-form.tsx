"use client"

import { useState } from "react"
import { useFormState } from "react-dom"
import { addSignoff, deleteSignoff, type SignoffActionState } from "@/lib/actions/signoffs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { FileCheck, CheckCircle2, Trash2 } from "lucide-react"

interface Signoff {
  id: string
  project_id: string
  signoff_name: string
  signoff_date: string
  created_at: string
}

export default function SignoffForm({
  projectId,
  slug,
  signoffs: initialSignoffs,
}: {
  projectId: string
  slug: string
  signoffs: Signoff[]
}) {
  const [signoffs, setSignoffs] = useState(initialSignoffs)
  const boundAction = addSignoff.bind(null, slug)
  const [state, formAction] = useFormState<SignoffActionState, FormData>(
    boundAction,
    {}
  )

  const handleDelete = async (signoffId: string) => {
    const result = await deleteSignoff(slug, signoffId)
    if (result.error) {
      toast.error(result.error)
    } else {
      setSignoffs((prev) => prev.filter((s) => s.id !== signoffId))
      toast.success("Sign-off removed")
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <CardHeader className="px-5 py-4 bg-gray-50/50 rounded-t-xl border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-base font-semibold text-gray-900">UAT Sign-Off</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="projectId" value={projectId} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="signoffName" className="text-xs text-gray-500">Name</Label>
                <Input
                  id="signoffName"
                  name="signoffName"
                  placeholder="e.g. John Smith (Client)"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signoffDate" className="text-xs text-gray-500">Date</Label>
                <Input
                  id="signoffDate"
                  name="signoffDate"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
            {state.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            {state.success && (
              <p className="text-sm text-green-600">Sign-off added successfully.</p>
            )}
            <Separator />
            <Button type="submit">
              Add Sign-Off
            </Button>
          </form>
        </CardContent>
      </Card>

      {signoffs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Existing Sign-Offs</h3>
          <div className="space-y-2">
            {signoffs.map((s) => (
              <div
                key={s.id}
                className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.signoff_name}</p>
                      <p className="text-xs text-gray-400">{new Date(s.signoff_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Sign-Off</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove the sign-off from {s.signoff_name}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(s.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
