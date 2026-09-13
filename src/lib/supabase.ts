import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars')
}

// Note: not parameterized with the hand-written Database type -- supabase-js's
// strict generic constraints don't line up with a hand-rolled schema (no live
// project to run `supabase gen types` against). App code types RPC/table
// results explicitly at each call site instead; src/types/database.ts remains
// the source of truth for those shapes.
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
