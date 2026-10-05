import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { Inbox, Mail, MailOpen, Phone, StickyNote, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  AdminService,
  type CarInquiryPublic,
  type CarInquiryUpdate,
} from "@/client"
import { ConfirmDialog } from "@/components/Common/ConfirmDialog"
import { DataTable } from "@/components/Common/DataTable"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const ALL = "all"
const UNREAD = "unread"
const READ = "read"

type StatusFilter = typeof ALL | typeof UNREAD | typeof READ

export const Route = createFileRoute("/_layout/admin/inquiries")({
  component: AdminInquiries,
  head: () => ({
    meta: [
      {
        title: "Inquiries - Aurelia Motorworks",
      },
    ],
  }),
})

const formatDate = (value: string): string =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })

function AdminInquiries() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>(ALL)
  const [notesFor, setNotesFor] = useState<CarInquiryPublic | null>(null)
  const [deleting, setDeleting] = useState<CarInquiryPublic | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ["inquiries", "admin", search, status],
    queryFn: async () =>
      (
        await AdminService.readInquiries({
          query: {
            limit: 200,
            search: search || undefined,
            is_read: status === ALL ? undefined : status === READ,
          },
        })
      ).data,
  })

  const leads = data?.data ?? []

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["inquiries"] })

  const patchMutation = useMutation({
    mutationFn: ({
      inquiryId,
      patch,
    }: {
      inquiryId: string
      patch: CarInquiryUpdate
    }) =>
      AdminService.adminUpdateInquiry({
        path: { inquiry_id: inquiryId },
        body: patch,
      }),
    onSuccess: () => {
      showSuccessToast("Inquiry updated")
      setNotesFor(null)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      refresh()
      // The overview and the sidebar badge both read this counter.
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (inquiryId: string) =>
      AdminService.adminDeleteInquiry({ path: { inquiry_id: inquiryId } }),
    onSuccess: () => {
      showSuccessToast("Inquiry deleted")
      setDeleting(null)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      refresh()
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] })
    },
  })

  const columns = useMemo<ColumnDef<CarInquiryPublic>[]>(
    () => [
      {
        id: "client",
        header: "Client",
        cell: ({ row }) => {
          const lead = row.original
          return (
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                {lead.name}
                {!lead.is_read && (
                  <span className="rounded bg-gold/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-gold">
                    New
                  </span>
                )}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="size-3" />
                {lead.email}
              </p>
              {lead.phone && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="size-3" />
                  {lead.phone}
                </p>
              )}
            </div>
          )
        },
      },
      {
        id: "vehicle",
        header: "Vehicle",
        cell: ({ row }) => {
          const car = row.original.car
          return (
            <div className="min-w-0">
              <p className="truncate font-medium">
                {car?.title ?? "Vehicle removed"}
              </p>
              {car && (
                <p className="text-xs text-muted-foreground">
                  {car.make} · {car.model} · {car.year}
                </p>
              )}
            </div>
          )
        },
      },
      {
        id: "message",
        header: "Message",
        cell: ({ row }) => (
          <p className="max-w-sm text-sm text-muted-foreground">
            {row.original.message ?? "—"}
          </p>
        ),
      },
      {
        id: "received",
        header: "Received",
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDate(row.original.created_at)}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const lead = row.original
          return (
            <div className="flex justify-end gap-1">
              <Button
                size="icon"
                variant="outline"
                aria-label={lead.is_read ? "Mark as unread" : "Mark as read"}
                disabled={patchMutation.isPending}
                onClick={() =>
                  patchMutation.mutate({
                    inquiryId: lead.id,
                    patch: { is_read: !lead.is_read },
                  })
                }
              >
                {lead.is_read ? (
                  <MailOpen className="size-4" />
                ) : (
                  <Mail className="size-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Add notes"
                onClick={() => setNotesFor(lead)}
              >
                <StickyNote className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Delete inquiry"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleting(lead)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          )
        },
      },
    ],
    [deleteMutation.isPending, patchMutation.isPending, patchMutation.mutate],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inquiries</h1>
        <p className="text-muted-foreground">
          Private viewing requests captured by the public showroom.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email or message"
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as StatusFilter)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All inquiries</SelectItem>
            <SelectItem value={UNREAD}>New only</SelectItem>
            <SelectItem value={READ}>Handled</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {data?.new_count ?? 0} new
        </span>
      </div>

      {isPending ? (
        <div className="h-64 animate-pulse rounded-xl border bg-card" />
      ) : (
        <DataTable columns={columns} data={leads} />
      )}

      {leads.length === 0 && !isPending && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Inbox className="size-4" />
          Nothing here yet.
        </p>
      )}

      <NotesDialog
        lead={notesFor}
        pending={patchMutation.isPending}
        onClose={() => setNotesFor(null)}
        onSave={(notes) =>
          notesFor &&
          patchMutation.mutate({
            inquiryId: notesFor.id,
            patch: { notes: notes || null },
          })
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this inquiry?"
        description={
          deleting
            ? `The inquiry from ${deleting.name} will be permanently removed, along with any concierge notes. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete inquiry"
        pending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  )
}

type NotesDialogProps = {
  lead: CarInquiryPublic | null
  pending: boolean
  onClose: () => void
  onSave: (notes: string) => void
}

function NotesDialog({ lead, pending, onClose, onSave }: NotesDialogProps) {
  const [notes, setNotes] = useState(lead?.notes ?? "")

  // The dialog is reused for every lead, so reload the field when it changes.
  useEffect(() => {
    setNotes(lead?.notes ?? "")
  }, [lead])

  return (
    <Dialog open={Boolean(lead)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Concierge notes</DialogTitle>
          <DialogDescription>
            {lead
              ? `${lead.name} · ${lead.car?.title ?? "Vehicle removed"}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          rows={6}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notes about this client, only visible to admins."
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={pending} onClick={() => onSave(notes)}>
            Save notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
