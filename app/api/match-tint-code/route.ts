import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface TintCodeRecord {
  id: number
  retail_name: string | null
  retail_code: string | null
  created_at: string
}

// Function to normalize text for comparison (remove dots, extra spaces, etc.)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\./g, '') // Remove dots
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      )
    }

    const normalizedCode = normalizeText(code)

    if (normalizedCode.length < 1) {
      return NextResponse.json({
        matched: false,
        exactMatch: false,
        code: null,
        suggestions: [],
        allTintCodes: [],
        message: 'Code too short for matching'
      })
    }

    console.log('🔍 Searching tint codes for:', normalizedCode)

    // Query database for tint codes
    let tintCodes: TintCodeRecord[] = []
    
    try {
      const { data: dbCodes, error } = await supabase
        .from('rx_code')
        .select('id, retail_name, retail_code, created_at')
        .not('retail_code', 'is', null)
        .limit(100)
      
      if (error) {
        console.error('Error querying rx_code:', error)
        return NextResponse.json(
          { error: 'Database query failed' },
          { status: 500 }
        )
      }

      if (!dbCodes || dbCodes.length === 0) {
        return NextResponse.json({
          matched: false,
          exactMatch: false,
          code: null,
          suggestions: [],
          allTintCodes: [],
          message: 'No tint codes found in database'
        })
      }

      tintCodes = dbCodes
    } catch (dbError) {
      console.error('Database query failed:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // 1. Check for exact match (normalized)
    const exactMatch = tintCodes.find(tint => {
      const normalizedTintCode = tint.retail_code ? normalizeText(tint.retail_code) : ''
      const normalizedTintName = tint.retail_name ? normalizeText(tint.retail_name) : ''
      return normalizedTintCode === normalizedCode || normalizedTintName === normalizedCode
    })

    if (exactMatch) {
      console.log('✅ Exact tint code match found:', exactMatch.retail_code)
      return NextResponse.json({
        matched: true,
        exactMatch: true,
        code: exactMatch.retail_code,
        tintCode: {
          id: exactMatch.id,
          retail_name: exactMatch.retail_name,
          retail_code: exactMatch.retail_code,
          source: 'tint_database'
        },
        suggestions: [],
        allTintCodes: tintCodes.map(t => ({
          id: t.id,
          retail_name: t.retail_name,
          retail_code: t.retail_code,
          source: 'tint_database'
        })),
        searchWords: [normalizedCode]
      })
    }

    // 2. Use ILIKE for partial matching
    const suggestions: any[] = []
    
    try {
      // Search using ILIKE for partial matches
      const searchPattern = `%${normalizedCode}%`
      
      const { data: nameMatches, error: nameError } = await supabase
        .from('rx_code')
        .select('id, retail_name, retail_code, created_at')
        .or(`retail_name.ilike.${searchPattern},retail_code.ilike.${searchPattern}`)
        .not('retail_code', 'is', null)
        .limit(10)
      
      if (!nameError && nameMatches) {
        suggestions.push(...nameMatches.map(tint => ({
          id: tint.id,
          retail_name: tint.retail_name,
          retail_code: tint.retail_code,
          source: 'tint_database',
          matchType: 'ilike_match'
        })))
      }
    } catch (searchError) {
      console.error('Error in ILIKE search:', searchError)
    }

    // Format all tint codes for dropdown
    const formattedAllTintCodes = tintCodes.map(t => ({
      id: t.id,
      retail_name: t.retail_name,
      retail_code: t.retail_code,
      source: 'tint_database'
    }))

    console.log(`📋 Found ${suggestions.length} tint code suggestions`)

    return NextResponse.json({
      matched: false,
      exactMatch: false,
      code: null,
      suggestions,
      allTintCodes: formattedAllTintCodes,
      searchWords: [normalizedCode],
      message: suggestions.length > 0 
        ? `Tint codes matching "${code}"` 
        : 'No matching tint codes found'
    })

  } catch (error) {
    console.error('Error matching tint code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve all tint codes
export async function GET() {
  try {
    const { data: tintCodes, error } = await supabase
      .from('rx_code')
      .select('id, retail_name, retail_code, created_at')
      .order('retail_name')
    
    if (error) {
      console.error('Error querying rx_code:', error)
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      tintCodes: tintCodes || [],
      total: tintCodes?.length || 0,
      source: 'tint_database'
    })

  } catch (error) {
    console.error('Error retrieving tint codes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 