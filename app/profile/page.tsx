"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { authApi } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TeacherApplicationCard } from "@/components/profile/TeacherApplicationCard"
import {
  ArrowLeft, User, Mail, Lock, Eye, EyeOff,
  ShieldCheck, Loader2, CheckCircle2, AlertCircle, Camera, X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRef } from "react"

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()

  // Profile fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  // UI state
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  // Seed fields from current user
  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [user])

  const userInitials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  const handleSaveProfile = async () => {
    setProfileErrors({})
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setProfileErrors({ name: "Name is required." })
      return
    }
    if (!trimmedEmail) {
      setProfileErrors({ email: "Email is required." })
      return
    }

    setIsSavingProfile(true)
    try {
      await authApi.updateProfile({
        name: trimmedName,
        email: trimmedEmail,
        avatar: avatarFile ?? undefined,
      })
      await refreshUser()
      setAvatarFile(null)
      setAvatarPreview(null)
      toast.success("Profile updated successfully.")
    } catch (err: any) {
      const serverErrors = err?.response?.data?.errors ?? {}
      if (Object.keys(serverErrors).length > 0) {
        const flat: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(serverErrors)) {
          flat[key] = (msgs as string[])[0]
        }
        setProfileErrors(flat)
      } else {
        toast.error(err?.response?.data?.message || "Failed to update profile.")
      }
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSavePassword = async () => {
    setPasswordErrors({})
    const errors: Record<string, string> = {}

    if (!currentPassword) errors.current_password = "Current password is required."
    if (!newPassword) errors.password = "New password is required."
    else if (newPassword.length < 8) errors.password = "Password must be at least 8 characters."
    if (!confirmPassword) errors.password_confirmation = "Please confirm your new password."
    else if (newPassword !== confirmPassword) errors.password_confirmation = "Passwords do not match."

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }

    setIsSavingPassword(true)
    try {
      await authApi.updateProfile({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Password changed successfully.")
    } catch (err: any) {
      const serverErrors = err?.response?.data?.errors ?? {}
      if (Object.keys(serverErrors).length > 0) {
        const flat: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(serverErrors)) {
          flat[key] = (msgs as string[])[0]
        }
        setPasswordErrors(flat)
      } else {
        toast.error(err?.response?.data?.message || "Failed to change password.")
      }
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/my-video">
            <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Profile Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account information</p>
          </div>
        </div>

        {/* Avatar + role card */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              {/* Clickable avatar with camera overlay */}
              <div className="relative shrink-0 group">
                <Avatar className="h-20 w-20 ring-2 ring-blue-100 dark:ring-blue-900 cursor-pointer"
                  onClick={() => avatarInputRef.current?.click()}>
                  {(avatarPreview || user?.avatar_url) ? (
                    <img
                      src={avatarPreview ?? user?.avatar_url ?? ""}
                      alt="Profile photo"
                      className="h-full w-full object-cover rounded-full"
                    />
                  ) : (
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-2xl font-bold">
                      {userInitials}
                    </AvatarFallback>
                  )}
                  {/* Camera overlay on hover */}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </Avatar>

                {/* Clear preview button */}
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}

                {/* Hidden file input */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 2 * 1024 * 1024) {
                      toast.error("Photo must be under 2 MB.")
                      return
                    }
                    setAvatarFile(file)
                    setAvatarPreview(URL.createObjectURL(file))
                  }}
                />
              </div>

              <div className="min-w-0">
                <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(user?.roles ?? []).map((role) => (
                    <Badge key={role} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-0 capitalize text-xs">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      {role}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {avatarPreview ? "New photo selected — save profile to apply." : "Click the photo to change it."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Become a teacher */}
        <TeacherApplicationCard isTeacher={(user?.roles ?? []).includes("teacher")} />

        {/* Edit profile */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              <CardTitle className="text-base">Personal Information</CardTitle>
            </div>
            <CardDescription>Update your name and email address.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className={cn(profileErrors.name && "border-red-400 focus-visible:ring-red-400")}
              />
              {profileErrors.name && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {profileErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={cn("pl-9", profileErrors.email && "border-red-400 focus-visible:ring-red-400")}
                />
              </div>
              {profileErrors.email && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {profileErrors.email}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
              >
                {isSavingProfile
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  : <><CheckCircle2 className="w-4 h-4 mr-2" /> Save Profile</>
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-500" />
              <CardTitle className="text-base">Change Password</CardTitle>
            </div>
            <CardDescription>Leave blank if you don't want to change your password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Current password */}
            <div className="space-y-1.5">
              <Label htmlFor="current_password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className={cn("pr-10", passwordErrors.current_password && "border-red-400 focus-visible:ring-red-400")}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.current_password && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {passwordErrors.current_password}
                </p>
              )}
            </div>

            <Separator className="my-1" />

            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={cn("pr-10", passwordErrors.password && "border-red-400 focus-visible:ring-red-400")}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.password && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {passwordErrors.password}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={cn("pr-10", passwordErrors.password_confirmation && "border-red-400 focus-visible:ring-red-400")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.password_confirmation && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {passwordErrors.password_confirmation}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSavePassword}
                disabled={isSavingPassword}
                className="bg-blue-600 hover:bg-blue-700 min-w-[140px]"
              >
                {isSavingPassword
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  : <><Lock className="w-4 h-4 mr-2" /> Change Password</>
                }
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </ProtectedRoute>
  )
}
