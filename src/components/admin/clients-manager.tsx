"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { addClient, deleteClient } from "@/lib/actions/clients"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Building2, Trash2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface ClientWithCount {
  id: string
  name: string
  created_at: string | null
  projectCount: number
}

export default function ClientsManager({
  clients,
}: {
  clients: ClientWithCount[]
}) {
  const router = useRouter()
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClientWithCount | null>(null)
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return

    setAdding(true)
    const result = await addClient(trimmed)
    setAdding(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(`"${trimmed}" added`)
    setNewName("")
    inputRef.current?.focus()
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteClient(deleteTarget.id)
    setDeleting(false)

    if (result.error) {
      toast.error(result.error)
      setDeleteTarget(null)
      return
    }

    toast.success(`"${deleteTarget.name}" deleted`)
    setDeleteTarget(null)
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-sage-darker transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to UAT Checklists
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight">
            Manage Clients
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="tabular-nums">{clients.length}</span>{" "}
            {clients.length === 1 ? "client" : "clients"} registered
          </p>
        </div>
      </div>

      {/* Add client form */}
      <form onSubmit={handleAdd} className="flex items-center gap-2 mb-6">
        <Input
          ref={inputRef}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New client name..."
          maxLength={200}
          className="border border-gray-300 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
        <Button type="submit" disabled={!newName.trim() || adding}>
          <Plus className="h-4 w-4 mr-1.5" />
          {adding ? "Adding..." : "Add Client"}
        </Button>
      </form>

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No clients yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Add your first client above to get started
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="text-xs font-medium text-gray-500">
                  Client Name
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 text-center w-[120px]">
                  Projects
                </TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className="group even:bg-gray-50">
                  <TableCell className="font-medium text-sm text-gray-800">
                    {client.name}
                  </TableCell>
                  <TableCell className="text-center">
                    {client.projectCount > 0 ? (
                      <span className="text-sm tabular-nums text-gray-700">
                        {client.projectCount}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setDeleteTarget(client)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-inset"
                      title={
                        client.projectCount > 0
                          ? `Cannot delete — used by ${client.projectCount} project(s)`
                          : `Delete ${client.name}`
                      }
                    >
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.projectCount
                ? `"${deleteTarget.name}" is used by ${deleteTarget.projectCount} project(s) and cannot be deleted. Remove or reassign those projects first.`
                : `This will permanently delete "${deleteTarget?.name}". This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            {!deleteTarget?.projectCount && (
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
