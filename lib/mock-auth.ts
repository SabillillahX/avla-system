export interface MockUser {
  id: number
  name: string
  email: string
  roles: string[]
}

const usersByEmail = new Map<string, MockUser>()
const usersByToken = new Map<string, MockUser>()
let nextId = 1

const nameFromEmail = (email: string) => {
  const atIndex = email.indexOf("@")
  if (atIndex === -1) return email
  return email.slice(0, atIndex) || email
}

export function ensureUser(params: { email: string; name?: string }): MockUser {
  const existing = usersByEmail.get(params.email)
  if (existing) return existing

  const user: MockUser = {
    id: nextId++,
    name: params.name?.trim() || nameFromEmail(params.email),
    email: params.email,
    roles: ["admin"],
  }

  usersByEmail.set(user.email, user)
  return user
}

export function issueToken(user: MockUser): string {
  const token = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  usersByToken.set(token, user)
  return token
}

export function getUserByToken(token: string | null | undefined): MockUser | null {
  if (!token) return null
  return usersByToken.get(token) ?? null
}

export function revokeToken(token: string | null | undefined) {
  if (!token) return
  usersByToken.delete(token)
}
