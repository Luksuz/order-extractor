import { NextRequest, NextResponse } from 'next/server'
import { supabase, type Customer } from '@/lib/supabase'

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

    console.log('🔍 Customers:', customers)

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
        .limit(5)

      if (containsError) {
        console.error('Supabase contains query error:', containsError)
      } else {
        customers = containsCustomers
      }
    }

    if (customers && customers.length > 0) {
      const customer = customers[0] as Customer
      
      // Check if it's an exact match or partial match
      const isExactMatch = customer.name?.toLowerCase() === normalizedSearchName.toLowerCase()
      
      return NextResponse.json({
        matched: true,
        exactMatch: isExactMatch,
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
        alternativeMatches: customers.slice(1).map(c => ({
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