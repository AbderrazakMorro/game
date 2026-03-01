import { createClient } from '@supabase/supabase-js'

// Lazy singleton — created on first use to avoid build-time errors
let _client = null

export function getSupabase() {
    if (!_client) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        _client = createClient(url, key)
    }
    return _client
}

// Keep backward compat: supabase is a proxy that delegates to the lazy client
export const supabase = new Proxy({}, {
    get(_, prop) {
        return getSupabase()[prop]
    },
})
