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
    const body = await request.json()
    const { code } = body
    
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Lens code is required' },
        { status: 400 }
      )
    }
    
    console.log('🔍 Matching lens code:', code)
    
    // Normalize the search term for better matching
    const normalizedSearchCode = code.trim()
    
    // Search in both rx_code and stock_code tables
    const rxMatches = findBestMatches(normalizedSearchCode, mockRxCodes, 'rx_code')
    const stockMatches = findBestMatches(normalizedSearchCode, mockStockCodes, 'stock_code')
    
    // Combine and sort all matches
    const allMatches = [...rxMatches, ...stockMatches]
      .sort((a, b) => b.similarity - a.similarity)
    
    console.log('🔍 All matches found:', allMatches.map(m => ({
      name: m.record.retail_name,
      code: m.record.retail_code,
      similarity: m.similarity,
      source: m.source
    })))
    
    if (allMatches.length === 0) {
      console.log('❌ No matches found for:', code)
      return NextResponse.json({
        matched: false,
        exactMatch: false,
        code: null,
        lensCode: null,
        suggestions: []
      })
    }
    
    const bestMatch = allMatches[0]
    const isExactMatch = bestMatch.similarity === 1.0
    
    console.log('🎯 Best match:', {
      input: code,
      matched: bestMatch.record.retail_name,
      code: bestMatch.record.retail_code,
      similarity: bestMatch.similarity,
      isExactMatch: isExactMatch
    })
    
    // Format suggestions (top 3, excluding exact match if found)
    const suggestions = allMatches
      .filter(match => !isExactMatch || match.similarity < 1.0) // Exclude exact match from suggestions
      .slice(0, 3)
      .map(match => ({
        retail_name: match.record.retail_name,
        retail_code: match.record.retail_code,
        source: match.source,
        similarity: match.similarity
      }))

    if (isExactMatch) {
      // Auto-fill only on exact match
      const response: LensCodeMatch = {
        matched: true,
        exactMatch: true,
        code: bestMatch.record.retail_code,
        lensCode: {
          retail_name: bestMatch.record.retail_name,
          retail_code: bestMatch.record.retail_code,
          source: bestMatch.source
        },
        suggestions: suggestions
      }
      
      console.log('✅ Exact lens code match found:', {
        input: code,
        matched: response.matched,
        exactMatch: response.exactMatch,
        bestMatch: response.lensCode
      })
      
      return NextResponse.json(response)
    } else {
      // Return suggestions only, no auto-fill
      const response: LensCodeMatch = {
        matched: false,
        exactMatch: false,
        code: null,
        lensCode: null,
        suggestions: suggestions
      }
      
      console.log('💡 Lens code suggestions found:', {
        input: code,
        suggestionsCount: suggestions.length,
        topSuggestion: suggestions[0]?.retail_name
      })
      
      return NextResponse.json(response)
    }
    
  } catch (error) {
    console.error('❌ Error matching lens code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 