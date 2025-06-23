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
    const normalizedSearchName = name.trim()

    if (normalizedSearchName.length < 2) {
      return NextResponse.json({
        matched: false,
        code: null,
        customer: null,
        message: 'Name too short for matching'
      })
    }

    // Query the Supabase customer database with multiple matching strategies
    // 1. First try exact match (case insensitive)
    let { data: customers, error } = await supabase
      .from('customer')
      .select('id, code, name, address1, address2, zip_postal_code, city, description')
      .ilike('name', normalizedSearchName)
      .limit(1)

    console.log('🔍 Exact match customers:', customers)

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      )
    }

    // 2. If no exact match, try partial match (starts with)
    if (!customers || customers.length === 0) {
      const { data: partialCustomers, error: partialError } = await supabase
        .from('customer')
        .select('id, code, name, address1, address2, zip_postal_code, city, description')
        .ilike('name', `${normalizedSearchName}%`)
        .limit(5)

      if (partialError) {
        console.error('Supabase partial query error:', partialError)
      } else {
        customers = partialCustomers
      }
    }

    // 3. If still no match, try contains match
    if (!customers || customers.length === 0) {
      const { data: containsCustomers, error: containsError } = await supabase
        .from('customer')
        .select('id, code, name, address1, address2, zip_postal_code, city, description')
        .ilike('name', `%${normalizedSearchName}%`)
        .limit(10)

      if (containsError) {
        console.error('Supabase contains query error:', containsError)
      } else {
        customers = containsCustomers
      }
    }

    // 4. If still no match, get all customers for fuzzy matching
    if (!customers || customers.length === 0) {
      const { data: allCustomers, error: allError } = await supabase
        .from('customer')
        .select('id, code, name, address1, address2, zip_postal_code, city, description')
        .not('name', 'is', null)
        .limit(200) // Increased limit for better fuzzy matching

      if (allError) {
        console.error('Supabase all customers query error:', allError)
      } else {
        customers = allCustomers
      }
    }

    if (customers && customers.length > 0) {
      let customer: any
      let isExactMatch = false
      let isFuzzyMatch = false
      let matchType = 'partial'
      
      // Check for exact match first
      const exactMatch = customers.find(c => 
        c.name?.toLowerCase() === normalizedSearchName.toLowerCase()
      )
      
      if (exactMatch) {
        customer = exactMatch
        isExactMatch = true
        matchType = 'exact'
      } else {
        // Try improved fuzzy matching
        const fuzzyMatch = findBestFuzzyMatch(normalizedSearchName, customers)
        if (fuzzyMatch && fuzzyMatch.score > 0.6) { // Higher threshold for fuzzy matches
          customer = fuzzyMatch.customer
          isFuzzyMatch = true
          matchType = fuzzyMatch.matchType
        } else {
          // Fall back to first result
          customer = customers[0]
          matchType = 'fallback'
        }
      }
      
      return NextResponse.json({
        matched: true,
        exactMatch: isExactMatch,
        fuzzyMatch: isFuzzyMatch,
        matchType: matchType,
        code: customer.code,
        customer: {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          address1: customer.address1,
          address2: customer.address2,
          zip_postal_code: customer.zip_postal_code,
          city: customer.city,
          description: customer.description
        },
        alternativeMatches: customers.slice(0, 5).filter(c => c.id !== customer.id).map(c => ({
          id: c.id,
          code: c.code,
          name: c.name,
          city: c.city
        }))
      })
    } else {
      return NextResponse.json({
        matched: false,
        code: null,
        customer: null,
        message: 'No matching customers found'
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