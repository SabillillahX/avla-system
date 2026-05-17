import { NextRequest, NextResponse } from "next/server"
import { ensureUser, issueToken } from "@/lib/mock-auth"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = body?.email
  const name = body?.name

  if (!email || typeof email !== "string") {
    return NextResponse.json({ message: "Email wajib diisi" }, { status: 400 })
  }

  const user = ensureUser({ email, name })
  const token = issueToken(user)

  return NextResponse.json({
    message: "Registrasi berhasil",
    user,
    token,
  })
}
