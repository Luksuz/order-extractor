import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface LensCodeRecord {
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
        allLensCodes: [],
        message: 'Code too short for matching'
      })
    }

    console.log('🔍 Searching lens codes for:', normalizedCode)

    // Query database for lens codes
    let allLensCodes: LensCodeRecord[] = []
    
    try {
      // Query stock_code table
      const { data: stockCodes, error: stockError } = await supabase
        .from('stock_code')
        .select('id, retail_name, retail_code, created_at')
        .not('retail_code', 'is', null)
        .limit(100)
      
      if (stockError) {
        console.error('Error querying stock_code:', stockError)
      } else if (stockCodes) {
        allLensCodes = [...allLensCodes, ...stockCodes]
      }

      if (allLensCodes.length === 0) {
        return NextResponse.json({
          matched: false,
          exactMatch: false,
          code: null,
          suggestions: [],
          allLensCodes: [],
          message: 'No lens codes found in database'
        })
      }

    } catch (dbError) {
      console.error('Database query failed:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // 1. Check for exact match (normalized)
    const exactMatch = allLensCodes.find(lens => {
      const normalizedLensCode = lens.retail_code ? normalizeText(lens.retail_code) : ''
      const normalizedLensName = lens.retail_name ? normalizeText(lens.retail_name) : ''
      return normalizedLensCode === normalizedCode || normalizedLensName === normalizedCode
    })

    if (exactMatch) {
      console.log('✅ Exact lens code match found:', exactMatch.retail_code)
      return NextResponse.json({
        matched: true,
        exactMatch: true,
        code: exactMatch.retail_code,
        lensCode: {
          id: exactMatch.id,
          retail_name: exactMatch.retail_name,
          retail_code: exactMatch.retail_code,
          source: 'lens_database'
        },
        suggestions: [],
        allLensCodes: allLensCodes.map(l => ({
          id: l.id,
          retail_name: l.retail_name,
          retail_code: l.retail_code,
          source: 'lens_database'
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
        .from('stock_code')
        .select('id, retail_name, retail_code, created_at')
        .or(`retail_name.ilike.${searchPattern},retail_code.ilike.${searchPattern}`)
        .not('retail_code', 'is', null)
        .limit(10)
      
      if (!nameError && nameMatches) {
        suggestions.push(...nameMatches.map(lens => ({
          id: lens.id,
          retail_name: lens.retail_name,
          retail_code: lens.retail_code,
          source: 'lens_database',
          matchType: 'ilike_match'
        })))
      }
    } catch (searchError) {
      console.error('Error in ILIKE search:', searchError)
    }

    // Format all lens codes for dropdown
    const formattedAllLensCodes = allLensCodes.map(l => ({
      id: l.id,
      retail_name: l.retail_name,
      retail_code: l.retail_code,
      source: 'lens_database'
    }))

    console.log(`📋 Found ${suggestions.length} lens code suggestions`)

    return NextResponse.json({
      matched: false,
      exactMatch: false,
      code: null,
      suggestions,
      allLensCodes: formattedAllLensCodes,
      searchWords: [normalizedCode],
      message: suggestions.length > 0 
        ? `Lens codes matching "${code}"` 
        : 'No matching lens codes found'
    })

  } catch (error) {
    console.error('Error matching lens code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 