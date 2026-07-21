"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Textarea } from "@/lib/components/ui/textarea"
import { Badge } from "@/lib/components/ui/badge"
import { Separator } from "@/lib/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/lib/components/ui/dialog"
import {
  GraduationCap, Loader2, Plus, Trash2, AlertCircle, CheckCircle2,
  Clock, XCircle, Sparkles, Briefcase, Award, FolderGit2, Tag,
  ImagePlus, ImageIcon,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  teacherApplicationApi,
  type TeacherApplication,
  type TeacherExperience,
  type TeacherEducation,
  type TeacherCertification,
  type TeacherPortfolio,
} from "@/lib/api/teacher"

/** A small section header used inside the application form. */
function SectionHeader({ icon: Icon, title, description }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}

/** Inline image uploader: picks a file, uploads it, and reports back the public URL. */
function ImageUploadField({ value, onChange }: {
  value?: string
  onChange: (url: string) => void
}) {
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be under 3 MB.")
      return
    }
    setIsUploading(true)
    try {
      const res = await teacherApplicationApi.uploadImage(file)
      onChange(res.url)
      toast.success("Image uploaded.")
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload image.")
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative">
          <img src={value} alt="Uploaded preview"
            className="h-16 w-16 rounded-md object-cover border border-gray-200 dark:border-gray-700" />
          <button type="button" onClick={() => onChange("")}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow">
            <XCircle className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      ) : (
        <div className="h-16 w-16 rounded-md border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-300">
          <ImageIcon className="w-6 h-6" />
        </div>
      )}
      <div>
        <Button type="button" variant="outline" size="sm" disabled={isUploading}
          onClick={() => inputRef.current?.click()}>
          {isUploading
            ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uploading…</>
            : <><ImagePlus className="w-3.5 h-3.5 mr-1.5" /> {value ? "Replace image" : "Upload image"}</>}
        </Button>
        <p className="text-[11px] text-gray-400 mt-1">JPG, PNG or WebP · up to 3 MB</p>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

const emptyExperience = (): TeacherExperience => ({ title: "", company: "", start_date: "", end_date: "", description: "" })
const emptyEducation = (): TeacherEducation => ({ school: "", degree: "", field_of_study: "", start_date: "", end_date: "" })
const emptyCertification = (): TeacherCertification => ({ name: "", issuer: "", issued_date: "", credential_url: "", image_url: "" })
const emptyPortfolio = (): TeacherPortfolio => ({ title: "", url: "", description: "", image_url: "" })

const MAX_IMAGE_BYTES = 3 * 1024 * 1024 // 3 MB

/** Visual status badge for an existing application. */
function StatusBadge({ status }: { status: TeacherApplication["status"] }) {
  const map = {
    pending: { icon: Clock, label: "Under review", className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
    approved: { icon: CheckCircle2, label: "Approved", className: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
    rejected: { icon: XCircle, label: "Rejected", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  } as const
  const { icon: Icon, label, className } = map[status]
  return (
    <Badge className={cn("border-0 gap-1 capitalize", className)}>
      <Icon className="w-3 h-3" /> {label}
    </Badge>
  )
}

export function TeacherApplicationCard({ isTeacher }: { isTeacher: boolean }) {
  const [application, setApplication] = useState<TeacherApplication | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form state
  const [headline, setHeadline] = useState("")
  const [bio, setBio] = useState("")
  const [experiences, setExperiences] = useState<TeacherExperience[]>([emptyExperience()])
  const [educations, setEducations] = useState<TeacherEducation[]>([emptyEducation()])
  const [certifications, setCertifications] = useState<TeacherCertification[]>([])
  const [portfolios, setPortfolios] = useState<TeacherPortfolio[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")

  // Teachers never need to apply — skip the network call entirely.
  useEffect(() => {
    if (isTeacher) {
      setIsLoading(false)
      return
    }
    let active = true
    teacherApplicationApi
      .get()
      .then((res) => { if (active) setApplication(res.data) })
      .catch(() => { /* silently ignore — card just shows the apply CTA */ })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [isTeacher])

  const canApply = useMemo(() => {
    if (isTeacher) return false
    // Allowed to (re)apply only when there's no application or it was rejected.
    return !application || application.status === "rejected"
  }, [isTeacher, application])

  const addSkill = () => {
    const value = skillInput.trim()
    if (!value) return
    if (skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setSkillInput("")
      return
    }
    setSkills((prev) => [...prev, value])
    setSkillInput("")
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!headline.trim()) next.headline = "Headline is required."
    if (experiences.some((e) => e.title.trim() === "" && (e.company || e.description))) {
      next.experiences = "Each experience needs a title."
    }
    if (educations.some((e) => e.school.trim() === "" && (e.degree || e.field_of_study))) {
      next.educations = "Each education entry needs a school name."
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      // Drop empty rows so we don't send blank entries to the API.
      const payload = {
        headline: headline.trim(),
        bio: bio.trim() || undefined,
        experiences: experiences.filter((e) => e.title.trim()),
        educations: educations.filter((e) => e.school.trim()),
        certifications: certifications.filter((c) => c.name.trim()),
        portfolios: portfolios.filter((p) => p.title.trim()),
        skills,
      }
      const res = await teacherApplicationApi.submit(payload)
      setApplication(res.data)
      setIsDialogOpen(false)
      toast.success(res.message || "Application submitted successfully.")
    } catch (err: any) {
      const serverErrors = err?.response?.data?.errors ?? {}
      if (Object.keys(serverErrors).length > 0) {
        const flat: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(serverErrors)) {
          flat[key] = (msgs as string[])[0]
        }
        setErrors(flat)
      } else {
        toast.error(err?.response?.data?.message || "Failed to submit application.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDialog = () => {
    // Pre-fill the form from a previous (rejected) application if present.
    if (application) {
      setHeadline(application.headline ?? "")
      setBio(application.bio ?? "")
      setExperiences(application.experiences?.length ? application.experiences : [emptyExperience()])
      setEducations(application.educations?.length ? application.educations : [emptyEducation()])
      setCertifications(application.certifications ?? [])
      setPortfolios(application.portfolios ?? [])
      setSkills(application.skills ?? [])
    }
    setErrors({})
    setIsDialogOpen(true)
  }

  if (isTeacher) return null

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-blue-500" />
          <CardTitle className="text-base">Become a Teacher</CardTitle>
        </div>
        <CardDescription>
          Share your professional background and start teaching on the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : application ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {application.headline}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Submitted on {new Date(application.created_at).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={application.status} />
            </div>

            {application.status === "pending" && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Your application is being reviewed. We'll notify you once a decision is made.
              </p>
            )}
            {application.status === "rejected" && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 space-y-2">
                <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  {application.review_note || "Your application was not approved this time."}
                </p>
                <Button size="sm" variant="outline" onClick={openDialog}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Update & reapply
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tell us about your headline, experience, education, certifications, portfolio,
              and skills — just like a professional profile.
            </p>
            <Button onClick={openDialog} className="bg-blue-600 hover:bg-blue-700">
              <GraduationCap className="w-4 h-4 mr-2" /> Apply to teach
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-500" /> Teacher Application
            </DialogTitle>
            <DialogDescription>
              Build a professional profile that shows learners why they should learn from you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Headline + bio */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="headline">Headline <span className="text-red-500">*</span></Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer & React Mentor"
                  className={cn(errors.headline && "border-red-400 focus-visible:ring-red-400")}
                />
                {errors.headline && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.headline}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short summary about yourself and what you teach."
                  rows={4}
                />
              </div>
            </div>

            <Separator />

            {/* Experience */}
            <div className="space-y-3">
              <SectionHeader icon={Briefcase} title="Experience" description="Your relevant work history." />
              {errors.experiences && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.experiences}
                </p>
              )}
              {experiences.map((exp, i) => (
                <div key={i} className="rounded-md border border-gray-200 dark:border-gray-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Experience #{i + 1}</span>
                    {experiences.length > 1 && (
                      <button type="button" onClick={() => setExperiences((p) => p.filter((_, idx) => idx !== i))}
                        className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input placeholder="Title / Role" value={exp.title}
                      onChange={(e) => setExperiences((p) => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
                    <Input placeholder="Company" value={exp.company}
                      onChange={(e) => setExperiences((p) => p.map((x, idx) => idx === i ? { ...x, company: e.target.value } : x))} />
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Start date</Label>
                      <Input type="date" value={exp.start_date}
                        onChange={(e) => setExperiences((p) => p.map((x, idx) => idx === i ? { ...x, start_date: e.target.value } : x))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">End date</Label>
                      <Input type="date" value={exp.end_date}
                        onChange={(e) => setExperiences((p) => p.map((x, idx) => idx === i ? { ...x, end_date: e.target.value } : x))} />
                    </div>
                  </div>
                  <Textarea placeholder="What did you do?" rows={2} value={exp.description}
                    onChange={(e) => setExperiences((p) => p.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setExperiences((p) => [...p, emptyExperience()])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add experience
              </Button>
            </div>

            <Separator />

            {/* Education */}
            <div className="space-y-3">
              <SectionHeader icon={GraduationCap} title="Education" description="Your academic background." />
              {errors.educations && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.educations}
                </p>
              )}
              {educations.map((edu, i) => (
                <div key={i} className="rounded-md border border-gray-200 dark:border-gray-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Education #{i + 1}</span>
                    {educations.length > 1 && (
                      <button type="button" onClick={() => setEducations((p) => p.filter((_, idx) => idx !== i))}
                        className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input placeholder="School / University" value={edu.school}
                      onChange={(e) => setEducations((p) => p.map((x, idx) => idx === i ? { ...x, school: e.target.value } : x))} />
                    <Input placeholder="Degree" value={edu.degree}
                      onChange={(e) => setEducations((p) => p.map((x, idx) => idx === i ? { ...x, degree: e.target.value } : x))} />
                    <Input placeholder="Field of study" value={edu.field_of_study}
                      onChange={(e) => setEducations((p) => p.map((x, idx) => idx === i ? { ...x, field_of_study: e.target.value } : x))} />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Start date</Label>
                        <Input type="date" value={edu.start_date}
                          onChange={(e) => setEducations((p) => p.map((x, idx) => idx === i ? { ...x, start_date: e.target.value } : x))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">End date</Label>
                        <Input type="date" value={edu.end_date}
                          onChange={(e) => setEducations((p) => p.map((x, idx) => idx === i ? { ...x, end_date: e.target.value } : x))} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setEducations((p) => [...p, emptyEducation()])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add education
              </Button>
            </div>

            <Separator />

            {/* Certifications */}
            <div className="space-y-3">
              <SectionHeader icon={Award} title="Certifications" description="Optional — licenses & certificates." />
              {certifications.map((cert, i) => (
                <div key={i} className="rounded-md border border-gray-200 dark:border-gray-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Certification #{i + 1}</span>
                    <button type="button" onClick={() => setCertifications((p) => p.filter((_, idx) => idx !== i))}
                      className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input placeholder="Name" value={cert.name}
                      onChange={(e) => setCertifications((p) => p.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                    <Input placeholder="Issuer" value={cert.issuer}
                      onChange={(e) => setCertifications((p) => p.map((x, idx) => idx === i ? { ...x, issuer: e.target.value } : x))} />
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Issued date</Label>
                      <Input type="date" value={cert.issued_date}
                        onChange={(e) => setCertifications((p) => p.map((x, idx) => idx === i ? { ...x, issued_date: e.target.value } : x))} />
                    </div>
                    <Input placeholder="Credential URL" value={cert.credential_url}
                      onChange={(e) => setCertifications((p) => p.map((x, idx) => idx === i ? { ...x, credential_url: e.target.value } : x))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400">Certificate image</Label>
                    <ImageUploadField value={cert.image_url}
                      onChange={(url) => setCertifications((p) => p.map((x, idx) => idx === i ? { ...x, image_url: url } : x))} />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setCertifications((p) => [...p, emptyCertification()])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add certification
              </Button>
            </div>

            <Separator />

            {/* Portfolio */}
            <div className="space-y-3">
              <SectionHeader icon={FolderGit2} title="Portfolio" description="Optional — projects or work samples." />
              {portfolios.map((item, i) => (
                <div key={i} className="rounded-md border border-gray-200 dark:border-gray-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Portfolio #{i + 1}</span>
                    <button type="button" onClick={() => setPortfolios((p) => p.filter((_, idx) => idx !== i))}
                      className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input placeholder="Title" value={item.title}
                      onChange={(e) => setPortfolios((p) => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
                    <Input placeholder="URL" value={item.url}
                      onChange={(e) => setPortfolios((p) => p.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x))} />
                  </div>
                  <Textarea placeholder="Short description" rows={2} value={item.description}
                    onChange={(e) => setPortfolios((p) => p.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400">Portfolio image</Label>
                    <ImageUploadField value={item.image_url}
                      onChange={(url) => setPortfolios((p) => p.map((x, idx) => idx === i ? { ...x, image_url: url } : x))} />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setPortfolios((p) => [...p, emptyPortfolio()])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add portfolio item
              </Button>
            </div>

            <Separator />

            {/* Skills */}
            <div className="space-y-3">
              <SectionHeader icon={Tag} title="Skills" description="Add skills, press Enter or comma to confirm." />
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault()
                      addSkill()
                    }
                  }}
                  placeholder="e.g. React, TypeScript, Public Speaking"
                />
                <Button type="button" variant="outline" onClick={addSkill}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <Badge key={skill}
                      className="gap-1 border-0 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50">
                      {skill}
                      <button type="button" onClick={() => setSkills((p) => p.filter((s) => s !== skill))}
                        className="hover:text-red-600">
                        <XCircle className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !canApply}
              className="bg-blue-600 hover:bg-blue-700 min-w-[140px]">
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                : <><CheckCircle2 className="w-4 h-4 mr-2" /> Submit application</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
