import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface CoatingCodeRecord {
  id: number
  retail_name: string | null
  retail_code: string | null
  created_at: string
}

// Mock coating codes for development - replace with actual database queries
const mockCoatingCodes: CoatingCodeRecord[] = [
  { id: 1, retail_name: 'Anti-Reflective Standard', retail_code: 'AR_STD', created_at: '2024-01-01T00:00:00Z' },
  { id: 2, retail_name: 'Anti-Reflective Premium', retail_code: 'AR_PREM', created_at: '2024-01-01T00:00:00Z' },
  { id: 3, retail_name: 'Premium Green Coating', retail_code: 'PT GREEN', created_at: '2024-01-01T00:00:00Z' },
  { id: 4, retail_name: 'Blue Light Protection', retail_code: 'BLUE_LIGHT', created_at: '2024-01-01T00:00:00Z' },
  { id: 5, retail_name: 'Multi-Layer Coating', retail_code: 'MULTI_COAT', created_at: '2024-01-01T00:00:00Z' },
  { id: 6, retail_name: 'Scratch Resistant', retail_code: 'SCRATCH_RES', created_at: '2024-01-01T00:00:00Z' },
  { id: 7, retail_name: 'Hydrophobic Coating', retail_code: 'HYDRO_COAT', created_at: '2024-01-01T00:00:00Z' },
  { id: 8, retail_name: 'Mirror Coating Silver', retail_code: 'MIRROR_SIL', created_at: '2024-01-01T00:00:00Z' },
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
        allCoatingCodes: [],
        message: 'Code too short for matching'
      })
    }

    console.log('🔍 Searching coating codes for:', normalizedCode)

    // Try to query database first, fall back to mock data
    let coatingCodes = mockCoatingCodes
    
    try {
      // Uncomment when coating_codes table is available
      // const { data: dbCodes, error } = await supabase
      //   .from('coating_codes')
      //   .select('id, retail_name, retail_code, created_at')
      //   .not('retail_code', 'is', null)
      //   .limit(20)
      
      // if (!error && dbCodes) {
      //   coatingCodes = dbCodes
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
    const exactMatch = coatingCodes.find(coating => 
      coating.retail_code?.toLowerCase() === normalizedCode ||
      coating.retail_name?.toLowerCase() === normalizedCode
    )

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
        searchWords
      })
    }

    // 2. Word-by-word substring matching
    const wordMatches: any[] = []
    
    if (searchWords.length > 0) {
      for (const coating of coatingCodes) {
        if (!coating.retail_name && !coating.retail_code) continue
        
        let matchScore = 0
        const coatingNameLower = (coating.retail_name || '').toLowerCase()
        const coatingCodeLower = (coating.retail_code || '').toLowerCase()
        
        // Check how many search words match in the coating name or code
        for (const word of searchWords) {
          const wordLower = word.toLowerCase()
          if (coatingNameLower.includes(wordLower) || coatingCodeLower.includes(wordLower)) {
            matchScore += 1
          }
        }
        
        // If at least one word matches, include in results
        if (matchScore > 0) {
          wordMatches.push({
            ...coating,
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
      .map(coating => ({
        id: coating.id,
        retail_name: coating.retail_name,
        retail_code: coating.retail_code,
        source: 'coating_database',
        matchType: coating.matchScore === searchWords.length ? 'full_word_match' : 'partial_word_match',
        matchScore: coating.matchScore,
        matchPercentage: coating.matchPercentage
      }))

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
      searchWords,
      message: suggestions.length > 0 
        ? `Found ${suggestions.length} coating codes matching "${searchWords.join(', ')}"` 
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
    let coatingCodes = mockCoatingCodes

    // Try to query database first
    try {
      // Uncomment when coating_codes table is available
      // const { data: dbCodes, error } = await supabase
      //   .from('coating_codes')
      //   .select('id, retail_name, retail_code, created_at')
      //   .order('retail_name')
      
      // if (!error && dbCodes) {
      //   coatingCodes = dbCodes
      // }
    } catch (dbError) {
      console.warn('Database query failed, using mock data:', dbError)
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