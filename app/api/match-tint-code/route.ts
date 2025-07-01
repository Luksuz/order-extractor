import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface TintCodeRecord {
  id: number
  retail_name: string | null
  retail_code: string | null
  created_at: string
}

// Mock tint codes for development - replace with actual database queries
const mockTintCodes: TintCodeRecord[] = [
  { id: 1, retail_name: 'Gray Tint', retail_code: 'GRAY', created_at: '2024-01-01T00:00:00Z' },
  { id: 2, retail_name: 'Brown Tint', retail_code: 'BROWN', created_at: '2024-01-01T00:00:00Z' },
  { id: 3, retail_name: 'Green Tint', retail_code: 'GREEN', created_at: '2024-01-01T00:00:00Z' },
  { id: 4, retail_name: 'Blue Tint', retail_code: 'BLUE', created_at: '2024-01-01T00:00:00Z' },
  { id: 5, retail_name: 'Yellow Tint', retail_code: 'YELLOW', created_at: '2024-01-01T00:00:00Z' },
  { id: 6, retail_name: 'Pink Tint', retail_code: 'PINK', created_at: '2024-01-01T00:00:00Z' },
  { id: 7, retail_name: 'Gradient Gray', retail_code: 'GRAD_GRAY', created_at: '2024-01-01T00:00:00Z' },
  { id: 8, retail_name: 'Photochromic', retail_code: 'PHOTOCHROMIC', created_at: '2024-01-01T00:00:00Z' },
  { id: 9, retail_name: 'Mirror Silver', retail_code: 'MIRROR_SIL', created_at: '2024-01-01T00:00:00Z' },
  { id: 10, retail_name: 'No Tint', retail_code: 'CLEAR', created_at: '2024-01-01T00:00:00Z' },
]

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      )
    }

    const normalizedCode = code.trim().toLowerCase()

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

    // Try to query database first, fall back to mock data
    let tintCodes = mockTintCodes
    
    try {
      // Uncomment when tint_codes table is available
      // const { data: dbCodes, error } = await supabase
      //   .from('tint_codes')
      //   .select('id, retail_name, retail_code, created_at')
      //   .not('retail_code', 'is', null)
      //   .limit(20)
      
      // if (!error && dbCodes) {
      //   tintCodes = dbCodes
      // }
    } catch (dbError) {
      console.warn('Database query failed, using mock data:', dbError)
    }

    // Clean and split search terms into individual words
    const searchWords = normalizedCode
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
      .split(' ')
      .filter(word => word.length > 1) // Filter out single character words

    console.log('🔍 Search words:', searchWords)

    // 1. Check for exact match
    const exactMatch = tintCodes.find(tint => 
      tint.retail_code?.toLowerCase() === normalizedCode ||
      tint.retail_name?.toLowerCase() === normalizedCode
    )

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
        searchWords
      })
    }

    // 2. Word-by-word substring matching
    const wordMatches: any[] = []
    
    if (searchWords.length > 0) {
      for (const tint of tintCodes) {
        if (!tint.retail_name && !tint.retail_code) continue
        
        let matchScore = 0
        const tintNameLower = (tint.retail_name || '').toLowerCase()
        const tintCodeLower = (tint.retail_code || '').toLowerCase()
        
        // Check how many search words match in the tint name or code
        for (const word of searchWords) {
          const wordLower = word.toLowerCase()
          if (tintNameLower.includes(wordLower) || tintCodeLower.includes(wordLower)) {
            matchScore += 1
          }
        }
        
        // If at least one word matches, include in results
        if (matchScore > 0) {
          wordMatches.push({
            ...tint,
            matchScore,
            matchPercentage: (matchScore / searchWords.length) * 100
          })
        }
      }
      
      // Sort by match score (descending) and then by name
      wordMatches.sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore
        }
        return (a.retail_name || a.retail_code || '').localeCompare(b.retail_name || b.retail_code || '')
      })
    }

    // Format suggestions (top matches)
    const suggestions = wordMatches
      .slice(0, 10)
      .map(tint => ({
        id: tint.id,
        retail_name: tint.retail_name,
        retail_code: tint.retail_code,
        source: 'tint_database',
        matchType: tint.matchScore === searchWords.length ? 'full_word_match' : 'partial_word_match',
        matchScore: tint.matchScore,
        matchPercentage: tint.matchPercentage
      }))

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
      searchWords,
      message: suggestions.length > 0 
        ? `Found ${suggestions.length} tint codes matching "${searchWords.join(', ')}"` 
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
    let tintCodes = mockTintCodes

    // Try to query database first
    try {
      // Uncomment when tint_codes table is available
      // const { data: dbCodes, error } = await supabase
      //   .from('tint_codes')
      //   .select('id, retail_name, retail_code, created_at')
      //   .order('retail_name')
      
      // if (!error && dbCodes) {
      //   tintCodes = dbCodes
      // }
    } catch (dbError) {
      console.warn('Database query failed, using mock data:', dbError)
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