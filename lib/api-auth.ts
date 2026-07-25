import { createServerSupabase } from '@/lib/supabase-server'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function requireAuth(): Promise<
  { supabase: SupabaseClient; user: User } | null
> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return { supabase, user }
}
