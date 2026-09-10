import { createClient } from '@supabase/supabase-js'

function cleanSupabaseUrl(url: string | undefined): string {
  if (!url) return 'https://suwesvmsbfxxtfyepsdv.supabase.co'
  let cleaned = url.trim()
  // Supprime /rest/v1 ou trailing slashes si accidentellement saisis dans les variables Vercel
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
  return cleaned || 'https://suwesvmsbfxxtfyepsdv.supabase.co'
}

const supabaseUrl = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)

const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_72bo4uT3XsLcuN1NwXtDlw_Y0f-M-p-'
).trim()

export const isSupabaseConfigured = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'))
)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

