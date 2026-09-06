import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://suwesvmsbfxxtfyepsdv.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_72bo4uT3XsLcuN1NwXtDlw_Y0f-M-p-'

export const isSupabaseConfigured = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'))
)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

