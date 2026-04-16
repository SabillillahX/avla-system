/**
 * Builds a full public URL for a file stored on the Laravel backend.
 *
 * Laravel serves public storage files from: {APP_URL}/storage/{path}
 * e.g. http://localhost:8000/storage/videos/thumbnails/abc.png
 *
 * Returns an empty string when the path is falsy so callers can
 * safely use it in `src` attributes / conditional rendering.
 */
export function getStorageUrl(path: string | null | undefined): string {
  if (!path) return ""

  const baseUrl = process.env.NEXT_PUBLIC_STORAGE_URL || ""

  // Avoid double slashes
  const cleanBase = baseUrl.replace(/\/+$/, "")
  const cleanPath = path.replace(/^\/+/, "")

  return `${cleanBase}/${cleanPath}`
}
