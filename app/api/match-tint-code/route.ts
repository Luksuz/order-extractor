import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface TintCodeRecord {
  id: number
  retail_name: string | null
  retail_code: string | null
  created_at: string
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

    // Query database for tint codes
    let tintCodes: TintCodeRecord[] = []
    
    try {
      const { data: dbCodes, error } = await supabase
        .from('rx_code')
        .select('id, retail_name, retail_code, created_at')
        .not('retail_code', 'is', null)
        .limit(100)
      
      if (error) {
        console.error('Error querying tint_code:', error)
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
    const { data: tintCodes, error } = await supabase
      .from('rx_code')
      .select('id, retail_name, retail_code, created_at')
      .order('retail_name')
    
    if (error) {
      console.error('Error querying tint_code:', error)
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