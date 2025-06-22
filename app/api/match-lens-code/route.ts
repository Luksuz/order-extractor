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
  alternativeMatches: Array<{
    retail_name: string | null
    retail_code: string | null
    source: 'rx_code' | 'stock_code'
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
  
  if (s1 === s2) return 1.0
  
  // Simple similarity calculation based on common characters and length
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  
  if (longer.length === 0) return 1.0
  
  let matches = 0
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++
    }
  }
  
  return matches / longer.length
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
      
      return {
        record,
        similarity: Math.max(nameMatch, codeMatch),
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
    
    // Search in both rx_code and stock_code tables
    const rxMatches = findBestMatches(code, mockRxCodes, 'rx_code')
    const stockMatches = findBestMatches(code, mockStockCodes, 'stock_code')
    
    // Combine and sort all matches
    const allMatches = [...rxMatches, ...stockMatches]
      .sort((a, b) => b.similarity - a.similarity)
    
    if (allMatches.length === 0) {
      return NextResponse.json({
        matched: false,
        exactMatch: false,
        code: null,
        lensCode: null,
        alternativeMatches: []
      })
    }
    
    const bestMatch = allMatches[0]
    const isExactMatch = bestMatch.similarity === 1.0
    
    const response: LensCodeMatch = {
      matched: true,
      exactMatch: isExactMatch,
      code: bestMatch.record.retail_code,
      lensCode: {
        retail_name: bestMatch.record.retail_name,
        retail_code: bestMatch.record.retail_code,
        source: bestMatch.source
      },
      alternativeMatches: allMatches.slice(1, 4).map(match => ({
        retail_name: match.record.retail_name,
        retail_code: match.record.retail_code,
        source: match.source
      }))
    }
    
    console.log('✅ Lens code match result:', {
      input: code,
      matched: response.matched,
      exactMatch: response.exactMatch,
      bestMatch: response.lensCode,
      alternativeCount: response.alternativeMatches.length
    })
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error matching lens code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 