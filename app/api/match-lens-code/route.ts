import { NextRequest, NextResponse } from 'next/server'

interface LensCodeRecord {
  id: number
  retail_name: string | null
  retail_code: string | null
  created_at: string
}

interface LensCodeMatch {
  matched: boolean
  exactMatch: boolean
  code: string | null
  lensCode: {
    retail_name: string | null
    retail_code: string | null
    source: 'rx_code' | 'stock_code'
  } | null
  suggestions: Array<{
    retail_name: string | null
    retail_code: string | null
    source: 'rx_code' | 'stock_code'
    similarity?: number
  }>
}

// Mock data for development - replace with actual database queries
const mockRxCodes: LensCodeRecord[] = [
  { id: 1, retail_name: 'Progressive Standard', retail_code: 'PROG_STD', created_at: '2024-01-01T00:00:00Z' },
  { id: 2, retail_name: 'Progressive Premium', retail_code: 'PROG_PREM', created_at: '2024-01-01T00:00:00Z' },
  { id: 3, retail_name: 'Single Vision CR39', retail_code: 'SV_CR39', created_at: '2024-01-01T00:00:00Z' },
  { id: 4, retail_name: 'Single Vision Polycarbonate', retail_code: 'SV_POLY', created_at: '2024-01-01T00:00:00Z' },
  { id: 5, retail_name: 'Bifocal Standard', retail_code: 'BIF_STD', created_at: '2024-01-01T00:00:00Z' },
  { id: 6, retail_name: 'High Index 1.67', retail_code: 'HI_167', created_at: '2024-01-01T00:00:00Z' },
  { id: 7, retail_name: 'Anti-Reflective Coating', retail_code: 'AR_COAT', created_at: '2024-01-01T00:00:00Z' },
  { id: 8, retail_name: 'Photochromic Transitions', retail_code: 'PHOTO_TR', created_at: '2024-01-01T00:00:00Z' },
]

const mockStockCodes: LensCodeRecord[] = [
  { id: 1, retail_name: 'OVMDXV Progressive', retail_code: 'OVMDXV', created_at: '2024-01-01T00:00:00Z' },
  { id: 2, retail_name: 'OVMSXV Single Vision', retail_code: 'OVMSXV', created_at: '2024-01-01T00:00:00Z' },
  { id: 3, retail_name: 'Standard Progressive', retail_code: 'STD_PROG', created_at: '2024-01-01T00:00:00Z' },
  { id: 4, retail_name: 'Premium Progressive', retail_code: 'PREM_PROG', created_at: '2024-01-01T00:00:00Z' },
  { id: 5, retail_name: 'Basic Single Vision', retail_code: 'BASIC_SV', created_at: '2024-01-01T00:00:00Z' },
  { id: 6, retail_name: 'Polycarbonate Lens', retail_code: 'POLY_LENS', created_at: '2024-01-01T00:00:00Z' },
]

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  // Check for exact match first
  if (s1 === s2) return 1.0
  
  // Check for exact match ignoring extra whitespace
  const s1Normalized = s1.replace(/\s+/g, ' ')
  const s2Normalized = s2.replace(/\s+/g, ' ')
  if (s1Normalized === s2Normalized) return 1.0
  
  // If one contains the other exactly (useful for partial codes/names)
  if (s1.length > 0 && s2.length > 0) {
    if (s1 === s2 || s1.includes(s2) && s2.length === s1.length) return 1.0
    if (s2.includes(s1) && s1.length === s2.length) return 1.0
  }
  
  // Fallback to similarity calculation for partial matches
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  
  if (longer.length === 0) return 1.0
  
  // Use a better similarity algorithm - Levenshtein-like
  let matches = 0
  let totalPossible = longer.length
  
  // Count exact character matches in sequence
  for (let i = 0; i < shorter.length; i++) {
    if (i < longer.length && shorter[i] === longer[i]) {
      matches++
    }
  }
  
  // Add partial credit for character presence
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches += 0.3 // Small bonus for containing the character
    }
  }
  
  return Math.min(matches / totalPossible, 1.0)
}

function findBestMatches(
  searchTerm: string, 
  records: LensCodeRecord[], 
  source: 'rx_code' | 'stock_code'
): Array<{ record: LensCodeRecord; similarity: number; source: 'rx_code' | 'stock_code' }> {
  const matches = records
    .map(record => {
      const nameMatch = record.retail_name 
        ? calculateSimilarity(searchTerm, record.retail_name) 
        : 0
      const codeMatch = record.retail_code 
        ? calculateSimilarity(searchTerm, record.retail_code) 
        : 0
      
      // Prioritize name matches over code matches for better user experience
      let similarity = Math.max(nameMatch, codeMatch)
      
      // If searching by name (contains letters/spaces), boost name match score
      const isNameSearch = /[a-zA-Z\s]/.test(searchTerm)
      if (isNameSearch && nameMatch > codeMatch) {
        similarity = nameMatch * 1.1 // Boost name matches slightly
      }
      
      return {
        record,
        similarity: Math.min(similarity, 1.0), // Cap at 1.0
        source
      }
    })
    .filter(match => match.similarity > 0.3) // Only include matches with >30% similarity
    .sort((a, b) => b.similarity - a.similarity)
  
  return matches
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
        allLensCodes: [],
        message: 'Code too short for matching'
      })
    }

    console.log('🔍 Searching lens codes for:', normalizedCode)

    // Get all lens codes for dropdown (combine both mock datasets)
    const allLensCodes = [...mockRxCodes, ...mockStockCodes]

    // Clean and split search terms into individual words
    const searchWords = normalizedCode
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
      .split(' ')
      .filter(word => word.length > 1) // Filter out single character words

    console.log('🔍 Search words:', searchWords)

    // 1. Check for exact match
    const exactMatch = allLensCodes.find(lens => 
      lens.retail_code?.toLowerCase() === normalizedCode ||
      lens.retail_name?.toLowerCase() === normalizedCode
    )

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
        searchWords
      })
    }

    // 2. Word-by-word substring matching
    const wordMatches: any[] = []
    
    if (searchWords.length > 0) {
      for (const lens of allLensCodes) {
        if (!lens.retail_name && !lens.retail_code) continue
        
        let matchScore = 0
        const lensNameLower = (lens.retail_name || '').toLowerCase()
        const lensCodeLower = (lens.retail_code || '').toLowerCase()
        
        // Check how many search words match in the lens name or code
        for (const word of searchWords) {
          const wordLower = word.toLowerCase()
          if (lensNameLower.includes(wordLower) || lensCodeLower.includes(wordLower)) {
            matchScore += 1
          }
        }
        
        // If at least one word matches, include in results
        if (matchScore > 0) {
          wordMatches.push({
            ...lens,
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
      .map(lens => ({
        id: lens.id,
        retail_name: lens.retail_name,
        retail_code: lens.retail_code,
        source: 'lens_database',
        matchType: lens.matchScore === searchWords.length ? 'full_word_match' : 'partial_word_match',
        matchScore: lens.matchScore,
        matchPercentage: lens.matchPercentage
      }))

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
      searchWords,
      message: suggestions.length > 0 
        ? `Found ${suggestions.length} lens codes matching "${searchWords.join(', ')}"` 
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