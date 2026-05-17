import { NextRequest, NextResponse } from "next/server"
import { revokeToken } from "@/lib/mock-auth"

const extractToken = (req: NextRequest) => {
  const authHeader = req.headers.get("authorization") || ""
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null
  return authHeader.slice("bearer ".length).trim()
}

export async function POST(req: NextRequest) {
  const token = extractToken(req)
  revokeToken(token)
  return NextResponse.json({ message: "Logout berhasil" })
}
