import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase URL ou Service Role Key não configurados no .env.local')
}

// Cliente Supabase que ignora RLS e tem permissões máximas.
// ATENÇÃO: Nunca use este cliente no Frontend (Client Components). Apenas em Server Actions/Rotas de API.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
