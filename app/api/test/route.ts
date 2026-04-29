import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  // Test 1: with anon key (what the app uses)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: anonData, error: anonError } = await anonClient
    .from('properties')
    .select('id, name')

  // Test 2: with service role key (bypasses all RLS)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: adminData, error: adminError } = await adminClient
    .from('properties')
    .select('id, name')

  return NextResponse.json({
    anon: { data: anonData, error: anonError?.message },
    admin: { data: adminData, error: adminError?.message },
  })
}
