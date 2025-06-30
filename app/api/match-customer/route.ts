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
        exactMatch: false,
        code: null,
        customer: null,
        suggestions: [],
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

    let exactMatchFound = false
    let exactMatchCustomer = null

    // Check for true exact match
    if (customers && customers.length > 0) {
      const exactMatch = customers.find(c => 
        c.name?.toLowerCase().trim() === normalizedSearchName.toLowerCase()
      )
      
      if (exactMatch) {
        exactMatchFound = true
        exactMatchCustomer = exactMatch
        console.log('✅ Exact match found:', exactMatch.name)
      }
    }

    // Always get additional customers for suggestions
    const { data: allCustomers, error: allError } = await supabase
      .from('customer')
      .select('id, code, name, address1, address2, zip_postal_code, city, description')
      .not('name', 'is', null)
      .limit(50) // Get more for better suggestions

    if (allError) {
      console.error('Supabase all customers query error:', allError)
    }

    // Find fuzzy matches for suggestions
    const suggestions: any[] = []
    
    if (allCustomers && allCustomers.length > 0) {
      // First try partial matches (starts with or contains)
      const partialMatches = allCustomers.filter(c => {
        if (!c.name) return false
        const customerName = c.name.toLowerCase()
        const searchLower = normalizedSearchName.toLowerCase()
        
        return customerName.includes(searchLower) || 
               searchLower.includes(customerName) ||
               customerName.startsWith(searchLower)
      })

      // Add partial matches to suggestions
      suggestions.push(...partialMatches.slice(0, 3))

      // If we don't have enough suggestions, add fuzzy matches
      if (suggestions.length < 3) {
        const fuzzyMatches = []
        const searchParts = splitAndCleanBusinessNames(normalizedSearchName)
        
        for (const customer of allCustomers) {
          if (!customer.name || suggestions.some(s => s.id === customer.id)) continue
          
          const fuzzyMatch = findBestFuzzyMatch(normalizedSearchName, [customer])
          if (fuzzyMatch && fuzzyMatch.score > 0.4) {
            fuzzyMatches.push({
              ...customer,
              matchScore: fuzzyMatch.score,
              matchType: fuzzyMatch.matchType
            })
          }
        }
        
        // Sort by match score and add to suggestions
        fuzzyMatches.sort((a, b) => b.matchScore - a.matchScore)
        suggestions.push(...fuzzyMatches.slice(0, 3 - suggestions.length))
      }
    }

    // Ensure we have unique suggestions and format them
    const uniqueSuggestions = suggestions
      .filter((customer, index, self) => 
        index === self.findIndex(c => c.id === customer.id)
      )
      .slice(0, 3)
      .map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        city: c.city,
        matchType: c.matchType || 'partial'
      }))

    if (exactMatchFound && exactMatchCustomer) {
      // Return exact match with auto-fill data + suggestions
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
        suggestions: uniqueSuggestions.filter(s => s.id !== exactMatchCustomer.id)
      })
    } else {
      // Return suggestions only, no auto-fill
      return NextResponse.json({
        matched: false,
        exactMatch: false,
        fuzzyMatch: uniqueSuggestions.length > 0,
        matchType: 'suggestions_only',
        code: null,
        customer: null,
        suggestions: uniqueSuggestions,
        message: uniqueSuggestions.length > 0 
          ? `Found ${uniqueSuggestions.length} similar customers` 
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