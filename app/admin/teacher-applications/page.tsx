"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, GraduationCap,
  Briefcase, Award, FolderGit2, Tag, Mail, ExternalLink, Inbox,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  adminTeacherApplicationApi,
  type AdminTeacherApplication,
} from "@/lib/api/admin/teacher-applications"

type StatusFilter = "pending" | "approved" | "rejected" | "all"

const statusMeta = {
  pending: { icon: Clock, label: "Under review", className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  approved: { icon: CheckCircle2, label: "Approved", className: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  rejected: { icon: XCircle, label: "Rejected", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
} as const

function StatusBadge({ status }: { status: AdminTeacherApplication["status"] }) {
  const { icon: Icon, label, className } = statusMeta[status]
  return (
    <Badge className={cn("border-0 gap-1", className)}>
      <Icon className="w-3 h-3" /> {label}
    </Badge>
  )
}

/** Render an ISO date (YYYY-MM-DD) as a short, readable label. */
function fmtDate(value?: string) {
  if (!value) return ""
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short" })
}

export default function AdminTeacherApplicationsPage() {
  const [applications, setApplications] = useState<AdminTeacherApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>("pending")

  // Detail / review dialog
  const [selected, setSelected] = useState<AdminTeacherApplication | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null)

  const load = async (status: StatusFilter) => {
    setIsLoading(true)
    try {
      const res = await adminTeacherApplicationApi.list(status === "all" ? undefined : status)
      setApplications(res.data.data ?? [])
    } catch {
      toast.error("Failed to load applications.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load(filter) }, [filter])

  const openDetail = (app: AdminTeacherApplication) => {
    setSelected(app)
    setReviewNote("")
  }

  const handleApprove = async () => {
    if (!selected) return
    setActionLoading("approve")
    try {
      await adminTeacherApplicationApi.approve(selected.id, reviewNote.trim() || undefined)
      toast.success("Application approved — user is now a teacher.")
      setSelected(null)
      load(filter)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to approve.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!selected) return
    if (!reviewNote.trim()) {
      toast.error("Please add a note explaining the rejection.")
      return
    }
    setActionLoading("reject")
    try {
      await adminTeacherApplicationApi.reject(selected.id, reviewNote.trim())
      toast.success("Application rejected.")
      setSelected(null)
      load(filter)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reject.")
    } finally {
      setActionLoading(null)
    }
  }

  const emptyText = useMemo(() => {
    if (filter === "pending") return "No applications awaiting review."
    return `No ${filter === "all" ? "" : filter + " "}applications found.`
  }, [filter])

  return (
    <ProtectedRoute requireRole="admin">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/my-video">
            <Button variant="outline" size="icon" className="rounded-full shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-blue-500" /> Teacher Applications
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Review and decide on requests to become a teacher.
            </p>
          </div>
        </div>

        {/* Status filter */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading applications…
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-gray-400 py-16">
            <Inbox className="w-10 h-10" />
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <Card key={app.id} className="shadow-sm border-gray-200 dark:border-gray-800 hover:border-blue-300 transition-colors cursor-pointer"
                onClick={() => openDetail(app)}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {app.user?.name ?? "Unknown user"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{app.headline}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(app.created_at).toLocaleDateString()} · {app.skills?.length ?? 0} skills
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail + review dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.user?.name}
                  <StatusBadge status={selected.status} />
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {selected.user?.email}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                <div>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">{selected.headline}</p>
                  {selected.bio && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-line">{selected.bio}</p>
                  )}
                </div>

                {/* Experience */}
                {selected.experiences?.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-blue-500" /> Experience</h3>
                    {selected.experiences.map((exp, i) => (
                      <div key={i} className="text-sm pl-5">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {exp.title}{exp.company ? ` · ${exp.company}` : ""}
                        </p>
                        {(exp.start_date || exp.end_date) && (
                          <p className="text-xs text-gray-400">{fmtDate(exp.start_date)} – {fmtDate(exp.end_date) || "Present"}</p>
                        )}
                        {exp.description && <p className="text-gray-600 dark:text-gray-300 text-xs mt-0.5">{exp.description}</p>}
                      </div>
                    ))}
                  </section>
                )}

                {/* Education */}
                {selected.educations?.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-blue-500" /> Education</h3>
                    {selected.educations.map((edu, i) => (
                      <div key={i} className="text-sm pl-5">
                        <p className="font-medium text-gray-900 dark:text-white">{edu.school}</p>
                        <p className="text-xs text-gray-500">
                          {[edu.degree, edu.field_of_study].filter(Boolean).join(", ")}
                          {(edu.start_date || edu.end_date) ? ` · ${fmtDate(edu.start_date)} – ${fmtDate(edu.end_date) || "Present"}` : ""}
                        </p>
                      </div>
                    ))}
                  </section>
                )}

                {/* Certifications */}
                {selected.certifications?.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5"><Award className="w-4 h-4 text-blue-500" /> Certifications</h3>
                    {selected.certifications.map((cert, i) => (
                      <div key={i} className="text-sm pl-5">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {cert.name}{cert.issuer ? ` · ${cert.issuer}` : ""}
                          {cert.issued_date ? ` · ${fmtDate(cert.issued_date)}` : ""}
                        </p>
                        {cert.credential_url && (
                          <a href={cert.credential_url} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                            View credential <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {cert.image_url && (
                          <a href={cert.image_url} target="_blank" rel="noreferrer" className="block mt-1.5">
                            <img src={cert.image_url} alt={cert.name}
                              className="h-24 rounded-md border border-gray-200 dark:border-gray-700 object-cover" />
                          </a>
                        )}
                      </div>
                    ))}
                  </section>
                )}

                {/* Portfolio */}
                {selected.portfolios?.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5"><FolderGit2 className="w-4 h-4 text-blue-500" /> Portfolio</h3>
                    {selected.portfolios.map((item, i) => (
                      <div key={i} className="text-sm pl-5">
                        <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                            {item.url} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {item.description && <p className="text-gray-600 dark:text-gray-300 text-xs mt-0.5">{item.description}</p>}
                        {item.image_url && (
                          <a href={item.image_url} target="_blank" rel="noreferrer" className="block mt-1.5">
                            <img src={item.image_url} alt={item.title}
                              className="h-24 rounded-md border border-gray-200 dark:border-gray-700 object-cover" />
                          </a>
                        )}
                      </div>
                    ))}
                  </section>
                )}

                {/* Skills */}
                {selected.skills?.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5"><Tag className="w-4 h-4 text-blue-500" /> Skills</h3>
                    <div className="flex flex-wrap gap-1.5 pl-5">
                      {selected.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </section>
                )}

                {/* Existing review note (for already-decided applications) */}
                {selected.review_note && selected.status !== "pending" && (
                  <div className="rounded-md bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Review note: </span>{selected.review_note}
                  </div>
                )}

                {/* Decision area — only for pending applications */}
                {selected.status === "pending" && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Review note</label>
                      <Textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Optional for approval, required for rejection."
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </div>

              {selected.status === "pending" && (
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={handleReject} disabled={actionLoading !== null}
                    className="border-red-300 text-red-600 hover:bg-red-50">
                    {actionLoading === "reject"
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rejecting…</>
                      : <><XCircle className="w-4 h-4 mr-2" /> Reject</>}
                  </Button>
                  <Button onClick={handleApprove} disabled={actionLoading !== null}
                    className="bg-green-600 hover:bg-green-700">
                    {actionLoading === "approve"
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving…</>
                      : <><CheckCircle2 className="w-4 h-4 mr-2" /> Approve & make teacher</>}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
