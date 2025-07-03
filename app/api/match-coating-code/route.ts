import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface CoatingCodeRecord {
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
        allCoatingCodes: [],
        message: 'Code too short for matching'
      })
    }

    console.log('🔍 Searching coating codes for:', normalizedCode)

    // Query database for coating codes
    let coatingCodes: CoatingCodeRecord[] = []
    
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
          allCoatingCodes: [],
          message: 'No coating codes found in database'
        })
      }

      coatingCodes = dbCodes
    } catch (dbError) {
      console.error('Database query failed:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // 1. Check for exact match (normalized)
    const exactMatch = coatingCodes.find(coating => {
      const normalizedCoatingCode = coating.retail_code ? normalizeText(coating.retail_code) : ''
      const normalizedCoatingName = coating.retail_name ? normalizeText(coating.retail_name) : ''
      return normalizedCoatingCode === normalizedCode || normalizedCoatingName === normalizedCode
    })

    if (exactMatch) {
      console.log('✅ Exact coating code match found:', exactMatch.retail_code)
      return NextResponse.json({
        matched: true,
        exactMatch: true,
        code: exactMatch.retail_code,
        coatingCode: {
          id: exactMatch.id,
          retail_name: exactMatch.retail_name,
          retail_code: exactMatch.retail_code,
          source: 'coating_database'
        },
        suggestions: [],
        allCoatingCodes: coatingCodes.map(c => ({
          id: c.id,
          retail_name: c.retail_name,
          retail_code: c.retail_code,
          source: 'coating_database'
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
        suggestions.push(...nameMatches.map(coating => ({
          id: coating.id,
          retail_name: coating.retail_name,
          retail_code: coating.retail_code,
          source: 'coating_database',
          matchType: 'ilike_match'
        })))
      }
    } catch (searchError) {
      console.error('Error in ILIKE search:', searchError)
    }

    // Format all coating codes for dropdown
    const formattedAllCoatingCodes = coatingCodes.map(c => ({
      id: c.id,
      retail_name: c.retail_name,
      retail_code: c.retail_code,
      source: 'coating_database'
    }))

    console.log(`📋 Found ${suggestions.length} coating code suggestions`)

    return NextResponse.json({
      matched: false,
      exactMatch: false,
      code: null,
      suggestions,
      allCoatingCodes: formattedAllCoatingCodes,
      searchWords: [normalizedCode],
      message: suggestions.length > 0 
        ? `Coating codes matching "${code}"` 
        : 'No matching coating codes found'
    })

  } catch (error) {
    console.error('Error matching coating code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve all coating codes
export async function GET() {
  try {
    const { data: coatingCodes, error } = await supabase
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
      coatingCodes: coatingCodes || [],
      total: coatingCodes?.length || 0,
      source: 'coating_database'
    })

  } catch (error) {
    console.error('Error retrieving coating codes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 