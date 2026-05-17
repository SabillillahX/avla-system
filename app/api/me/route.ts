import { NextRequest, NextResponse } from "next/server"
import { getUserByToken } from "@/lib/mock-auth"

const extractToken = (req: NextRequest) => {
  const authHeader = req.headers.get("authorization") || ""
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null
  return authHeader.slice("bearer ".length).trim()
}

export async function GET(req: NextRequest) {
  const token = extractToken(req)
  const user = getUserByToken(token)

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ user })
}
