import { NextRequest, NextResponse } from 'next/server'
import { supabase, type Customer } from '@/lib/supabase'

// Helper function to normalize names for better matching
function normalizeForMatching(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\b(sdn|bhd|pte|ltd|inc|corp|company|co|llc|limited)\b/g, '') // Remove common business suffixes
    .trim()
}

// Helper function to split input by common separators and clean each part
function splitAndCleanBusinessNames(input: string): string[] {
  // Split by common separators like /, |, &, and
  const parts = input.split(/[\/\|\&]|(?:\sand\s)/i)
    .map(part => part?.trim()) // Use optional chaining
    .filter(part => part && part.length > 0) // Filter out undefined, null, and empty strings
  
  // Return both original parts and normalized parts
  const allParts = [...parts]
  parts.forEach(part => {
    if (part) { // Check if part exists
      const normalized = normalizeForMatching(part)
      if (normalized && normalized !== part.toLowerCase()) {
        allParts.push(normalized)
      }
    }
  })
  
  return allParts
}

// Helper function to extract key words from a business name
function extractKeyWords(name: string): string[] {
  const normalized = normalizeForMatching(name)
  return normalized
    .split(' ')
    .filter(word => word.length > 2) // Filter out short words
    .filter(word => !['the', 'and', 'for', 'with', 'from', 'are', 'was', 'were', 'optic', 'optical', 'eyecare', 'eye', 'care', 'shop', 'store', 'centre', 'center'].includes(word)) // Filter out common words
}

// Helper function to calculate similarity score between two sets of keywords
function calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0
  
  let matches = 0
  for (const word1 of keywords1) {
    for (const word2 of keywords2) {
      // Exact match
      if (word1 === word2) {
        matches += 1
        break
      }
      // Partial match (substring) - only for longer words
      if (word1.length > 3 && word2.length > 3) {
        if (word1.includes(word2) || word2.includes(word1)) {
          matches += 0.7
          break
        }
      }
    }
  }
  
  // Calculate similarity as percentage of matches
  return matches / Math.max(keywords1.length, keywords2.length)
}

// Helper function to check substring matches
function findSubstringMatches(searchParts: string[], customers: any[]): { customer: any; score: number; matchType: string }[] {
  const matches: { customer: any; score: number; matchType: string }[] = []
  
  console.log('🔍 Checking substring matches for parts:', searchParts)
  
  for (const customer of customers) {
    if (!customer.name) continue
    
    const customerName = customer.name.toLowerCase()
    const customerNormalized = normalizeForMatching(customer.name)
    
    for (const searchPart of searchParts) {
      const searchLower = searchPart.toLowerCase()
      const searchNormalized = normalizeForMatching(searchPart)
      
      // Check if customer name contains the search part (or vice versa)
      if (customerName.includes(searchLower) || searchLower.includes(customerName)) {
        matches.push({
          customer,
          score: 0.9, // High score for substring match
          matchType: 'substring'
        })
        console.log(`✅ Substring match: "${searchPart}" <-> "${customer.name}"`)
        break
      }
      
      // Check normalized versions
      if (customerNormalized.includes(searchNormalized) || searchNormalized.includes(customerNormalized)) {
        matches.push({
          customer,
          score: 0.85, // Slightly lower for normalized substring match
          matchType: 'normalized_substring'
        })
        console.log(`✅ Normalized substring match: "${searchPart}" <-> "${customer.name}"`)
        break
      }
    }
  }
  
  return matches
}

// Helper function to find the best fuzzy match
function findBestFuzzyMatch(searchName: string, customers: any[]): { customer: any; score: number; matchType: string } | null {
  const searchParts = splitAndCleanBusinessNames(searchName)
  
  console.log('🔍 Fuzzy matching for:', searchName)
  console.log('🔍 Search parts:', searchParts)
  
  // First, try substring matching
  const substringMatches = findSubstringMatches(searchParts, customers)
  if (substringMatches.length > 0) {
    // Return the best substring match
    const bestSubstring = substringMatches.sort((a, b) => b.score - a.score)[0]
    console.log('🎯 Best substring match:', bestSubstring.customer.name, 'Score:', bestSubstring.score)
    return bestSubstring
  }
  
  // If no substring matches, try keyword matching
  let bestMatch: { customer: any; score: number; matchType: string } | null = null
  let bestScore = 0
  
  for (const searchPart of searchParts) {
    const searchKeywords = extractKeyWords(searchPart)
    if (searchKeywords.length === 0) continue
    
    console.log(`🔍 Keywords for "${searchPart}":`, searchKeywords)
    
    for (const customer of customers) {
      if (!customer.name) continue
      
      const customerKeywords = extractKeyWords(customer.name)
      const score = calculateKeywordSimilarity(searchKeywords, customerKeywords)
      
      if (score > bestScore && score > 0.4) { // Minimum 40% similarity
        bestScore = score
        bestMatch = {
          customer,
          score,
          matchType: 'keyword'
        }
        console.log(`🔍 Customer: ${customer.name}, Keywords: ${customerKeywords}, Score: ${score}`)
      }
    }
  }
  
  if (bestMatch) {
    console.log('🎯 Best keyword match:', bestMatch.customer.name, 'Score:', bestMatch.score)
  }
  
  return bestMatch
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Normalize the name for comparison (case insensitive, trim whitespace)
    const normalizedSearchName = name.trim().toLowerCase()

    if (normalizedSearchName.length < 1) {
      return NextResponse.json({
        matched: false,
        exactMatch: false,
        code: null,
        customer: null,
        suggestions: [],
        allCustomers: [],
        message: 'Name too short for matching'
      })
    }

    // Get all customers for dropdown
    const { data: allCustomers, error: allError } = await supabase
      .from('customer')
      .select('id, code, name, address1, address2, zip_postal_code, city, description')
      .not('name', 'is', null)
      .order('name')
      .limit(100)

    if (allError) {
      console.error('Supabase all customers query error:', allError)
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      )
    }

    // Clean and split search terms into individual words
    const searchWords = normalizedSearchName
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
      .split(' ')
      .filter(word => word.length > 1) // Filter out single character words

    console.log('🔍 Search words:', searchWords)

    // First try exact match (case insensitive)
    let { data: exactMatches, error } = await supabase
      .from('customer')
      .select('id, code, name, address1, address2, zip_postal_code, city, description')
      .ilike('name', normalizedSearchName)
      .limit(5)

    console.log('🔍 Exact match candidates:', exactMatches)

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      )
    }

    let exactMatchFound = false
    let exactMatchCustomer = null

    // Check for true exact match
    if (exactMatches && exactMatches.length > 0) {
      const exactMatch = exactMatches.find(c => {
        if (!c.name) return false
        const customerNameNormalized = c.name.toLowerCase().trim()
        const isExact = customerNameNormalized === normalizedSearchName
        console.log(`🔍 Comparing: "${normalizedSearchName}" === "${customerNameNormalized}" = ${isExact}`)
        return isExact
      })
      
      if (exactMatch) {
        exactMatchFound = true
        exactMatchCustomer = exactMatch
        console.log('✅ Exact match found:', exactMatch.name)
      }
    }

    // Word-by-word substring matching using ILIKE
    const wordMatches: any[] = []
    
    if (searchWords.length > 0 && allCustomers) {
      for (const customer of allCustomers) {
        if (!customer.name) continue
        
        let matchScore = 0
        const customerNameLower = customer.name.toLowerCase()
        
        // Check how many search words match in the customer name
        for (const word of searchWords) {
          if (customerNameLower.includes(word.toLowerCase())) {
            matchScore += 1
          }
        }
        
        // If at least one word matches, include in results
        if (matchScore > 0) {
          wordMatches.push({
            ...customer,
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
        return a.name.localeCompare(b.name)
      })
    }

    // Format suggestions (top matches)
    const suggestions = wordMatches
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        city: c.city,
        matchType: c.matchScore === searchWords.length ? 'full_word_match' : 'partial_word_match',
        matchScore: c.matchScore,
        matchPercentage: c.matchPercentage
      }))

    // Format all customers for dropdown
    const formattedAllCustomers = (allCustomers || []).map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      city: c.city
    }))

    if (exactMatchFound && exactMatchCustomer) {
      // Return exact match with auto-fill data + suggestions + all customers
      return NextResponse.json({
        matched: true,
        exactMatch: true,
        fuzzyMatch: false,
        matchType: 'exact',
        code: exactMatchCustomer.code,
        customer: {
          id: exactMatchCustomer.id,
          code: exactMatchCustomer.code,
          name: exactMatchCustomer.name,
          address1: exactMatchCustomer.address1,
          address2: exactMatchCustomer.address2,
          zip_postal_code: exactMatchCustomer.zip_postal_code,
          city: exactMatchCustomer.city,
          description: exactMatchCustomer.description
        },
        suggestions: suggestions.filter(s => s.id !== exactMatchCustomer.id),
        allCustomers: formattedAllCustomers,
        searchWords
      })
    } else {
      // Return suggestions + all customers for dropdown
      return NextResponse.json({
        matched: false,
        exactMatch: false,
        fuzzyMatch: suggestions.length > 0,
        matchType: 'word_matching',
        code: null,
        customer: null,
        suggestions,
        allCustomers: formattedAllCustomers,
        searchWords,
        message: suggestions.length > 0 
          ? `Found ${suggestions.length} customers matching "${searchWords.join(', ')}"` 
          : 'No matching customers found'
      })
    }

  } catch (error) {
    console.error('Error matching customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve all customers
export async function GET() {
  try {
    const { data: customers, error } = await supabase
      .from('customer')
      .select('id, code, name, address1, address2, zip_postal_code, city, description')
      .order('name')

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      customers: customers || [],
      total: customers?.length || 0,
      source: 'supabase'
    })

  } catch (error) {
    console.error('Error retrieving customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 