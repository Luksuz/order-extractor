import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key not found in environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Customer database types
export interface Customer {
  id: number
  created_at: string
  code: string | null
  name: string | null
  address1: string | null
  address2: string | null
  zip_postal_code: string | null
  city: string | null
  description: string | null
} 