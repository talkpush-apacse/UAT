"use client"

import { useState } from "react"
import { useFormState } from "react-dom"
import { addSignoff, deleteSignoff, type SignoffActionState } from "@/lib/actions/signoffs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      <Card>
        <CardHeader>
          <CardTitle>UAT Sign-Off</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="projectId" value={projectId} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signoffName">Name</Label>
                <Input
                  id="signoffName"
                  name="signoffName"
                  placeholder="e.g. John Smith (Client)"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signoffDate">Date</Label>
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
            <Button type="submit">
              Add Sign-Off
            </Button>
          </form>
        </CardContent>
      </Card>

      {signoffs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Existing Sign-Offs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {signoffs.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div>
                    <p className="font-medium">{s.signoff_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(s.signoff_date).toLocaleDateString()}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        Remove
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
