import { supabase } from './supabaseClient'

// Custom Fullscreen Focus Mode backgrounds — signed-in users only (see
// SettingsModal.jsx's `user &&` gate; guests never see this UI at all).
// The bucket is PRIVATE (see supabase/schema.sql's storage block): each
// user's image lives at one fixed key, never a signed/public URL — reads go
// through createSignedUrl() (see getFullscreenBackgroundUrl below), which is
// itself RLS-checked against the caller's own auth.uid(), so a signed URL
// can only ever be minted for the caller's own file.
export const BACKGROUND_BUCKET = 'fullscreen-backgrounds'

// Enforced client-side here for fast feedback, AND server-side via the
// bucket's own file_size_limit/allowed_mime_types (see schema.sql) — a
// client-only check is trivially bypassable, so both layers matter.
export const MAX_BACKGROUND_BYTES = 5 * 1024 * 1024
export const ALLOWED_BACKGROUND_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const NOT_CONFIGURED_ERROR = { message: 'Not available right now.' }

// A single fixed key per user (no extension) rather than one-file-per-
// upload — every new upload overwrites this exact object (upsert: true), so
// re-uploading never leaves an orphaned previous image behind in storage.
function backgroundPathForUser(userId) {
  return `${userId}/background`
}

export function validateBackgroundFile(file) {
  if (!ALLOWED_BACKGROUND_TYPES.includes(file.type)) {
    return { valid: false, reason: 'type' }
  }
  if (file.size > MAX_BACKGROUND_BYTES) {
    return { valid: false, reason: 'size' }
  }
  return { valid: true }
}

// Returns { path, error }. Caller (SettingsModal) is responsible for
// persisting `path` into settings.fullscreenBackgroundPath via patchSettings
// on success — this function only talks to Storage, not to storage.js.
export async function uploadFullscreenBackground(file, userId) {
  if (!supabase) return { path: null, error: NOT_CONFIGURED_ERROR }
  const path = backgroundPathForUser(userId)
  const { error } = await supabase.storage
    .from(BACKGROUND_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) return { path: null, error }
  return { path, error: null }
}

export async function removeFullscreenBackground(userId) {
  if (!supabase) return { error: NOT_CONFIGURED_ERROR }
  const { error } = await supabase.storage.from(BACKGROUND_BUCKET).remove([backgroundPathForUser(userId)])
  return { error }
}

// 1 hour is generous enough that a signed URL resolved once on entering
// Fullscreen Focus Mode comfortably outlasts any realistic session, without
// the URL staying valid indefinitely (see the bucket's private + RLS
// design above — a stale-forever public link would defeat that entirely).
const SIGNED_URL_TTL_SECONDS = 60 * 60

export async function getFullscreenBackgroundUrl(path) {
  if (!supabase || !path) return { url: null, error: null }
  const { data, error } = await supabase.storage.from(BACKGROUND_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error) return { url: null, error }
  return { url: data.signedUrl, error: null }
}
