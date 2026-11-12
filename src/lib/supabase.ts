import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseReady = Boolean(url && key)

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder',
)

export type CheckInResult =
  | { ok: true; title: string }
  | { ok: false; error: 'invalid_code' | 'already_in' | 'network'; title?: string }

export async function checkIn(code: string, first: string, last: string, device: string): Promise<CheckInResult> {
  const { data, error } = await supabase.rpc('att_check_in', {
    p_code: code,
    p_first: first,
    p_last: last,
    p_device: device,
  })
  if (error || !data) return { ok: false, error: 'network' }
  return data as CheckInResult
}

export type Session = {
  id: string
  title: string
  code: string
  is_active: boolean
  created_at: string
}

export type Checkin = {
  id: string
  session_id: string
  first_name: string
  last_name: string
  device_id: string
  hidden: boolean
  created_at: string
}
