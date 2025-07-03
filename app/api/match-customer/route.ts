import { NextRequest, NextResponse } from 'next/server'
import { supabase, type Customer } from '@/lib/supabase'

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
    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const normalizedSearchName = normalizeText(name)

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

    console.log('🔍 Searching customers for:', normalizedSearchName)

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

    if (!allCustomers || allCustomers.length === 0) {
      return NextResponse.json({
        matched: false,
        exactMatch: false,
        code: null,
        customer: null,
        suggestions: [],
        allCustomers: [],
        message: 'No customers found in database'
      })
    }

    // 1. Check for exact match (normalized)
    const exactMatch = allCustomers.find(customer => {
      const normalizedCustomerName = customer.name ? normalizeText(customer.name) : ''
      const normalizedCustomerCode = customer.code ? normalizeText(customer.code) : ''
      return normalizedCustomerName === normalizedSearchName || normalizedCustomerCode === normalizedSearchName
    })

    if (exactMatch) {
      console.log('✅ Exact customer match found:', exactMatch.name)
      return NextResponse.json({
        matched: true,
        exactMatch: true,
        fuzzyMatch: false,
        matchType: 'exact',
        code: exactMatch.code,
        customer: {
          id: exactMatch.id,
          code: exactMatch.code,
          name: exactMatch.name,
          address1: exactMatch.address1,
          address2: exactMatch.address2,
          zip_postal_code: exactMatch.zip_postal_code,
          city: exactMatch.city,
          description: exactMatch.description
        },
        suggestions: [],
        allCustomers: allCustomers.map(c => ({
          id: c.id,
          code: c.code,
          name: c.name,
          city: c.city
        })),
        searchWords: [normalizedSearchName]
      })
    }

    // 2. Use ILIKE for partial matching
    const suggestions: any[] = []
    
    try {
      // Search using ILIKE for partial matches
      const searchPattern = `%${normalizedSearchName}%`
      
      const { data: nameMatches, error: nameError } = await supabase
        .from('customer')
        .select('id, code, name, address1, address2, zip_postal_code, city, description')
        .or(`name.ilike.${searchPattern},code.ilike.${searchPattern}`)
        .not('name', 'is', null)
        .limit(10)
      
      if (!nameError && nameMatches) {
        suggestions.push(...nameMatches.map(customer => ({
          id: customer.id,
          code: customer.code,
          name: customer.name,
          city: customer.city,
          matchType: 'ilike_match'
        })))
      }
    } catch (searchError) {
      console.error('Error in ILIKE search:', searchError)
    }

    // Format all customers for dropdown
    const formattedAllCustomers = allCustomers.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      city: c.city
    }))

    console.log(`📋 Found ${suggestions.length} customer suggestions`)

    return NextResponse.json({
      matched: false,
      exactMatch: false,
      fuzzyMatch: suggestions.length > 0,
      matchType: 'ilike_matching',
      code: null,
      customer: null,
      suggestions,
      allCustomers: formattedAllCustomers,
      searchWords: [normalizedSearchName],
      message: suggestions.length > 0 
        ? `Customers matching "${name}"` 
        : 'No matching customers found'
    })

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