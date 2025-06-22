import { NextRequest, NextResponse } from 'next/server'
import * as soap from 'soap'
import { convertToVCA, validateOrderData, type OrderData } from '@/lib/vca-converter'

// RxOffice EDI Configuration
const RXOFFICE_CONFIG = {
  wsdlUrl: process.env.RXOFFICE_WSDL_URL || 'http://127.0.0.1:5000/CommonEDIService.svc?wsdl',
  userName: process.env.RXOFFICE_USERNAME || '380',
  password: process.env.RXOFFICE_PASSWORD || 'ZOHO123'
}

// Toggle for testing - set to true to use real SOAP service
const USE_REAL_SOAP_SERVICE = process.env.USE_REAL_SOAP_SERVICE === 'true' || true

export async function POST(request: NextRequest) {
  console.log('\n🚀 === CREATE ORDER SOAP ROUTE STARTED ===')
  console.log('📅 Timestamp:', new Date().toISOString())
  console.log('🔧 USE_REAL_SOAP_SERVICE:', USE_REAL_SOAP_SERVICE)
  console.log('🌐 WSDL URL:', RXOFFICE_CONFIG.wsdlUrl)
  
  try {
    console.log('📝 Parsing request body...')
    const { orderData, credentials } = await request.json()
    console.log('✅ Request body parsed successfully')
    console.log('📋 Order data received:', !!orderData ? 'YES' : 'NO')
    console.log('🔐 Credentials provided:', !!credentials ? 'YES' : 'NO')

    if (!orderData) {
      console.log('❌ No order data provided')
      return NextResponse.json(
        { error: 'Order data is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Validating order data...')
    // Validate order data
    const validation = validateOrderData(orderData as OrderData)
    console.log('📊 Validation result:', validation.isValid ? 'VALID' : 'INVALID')
    
    if (!validation.isValid) {
      console.log('❌ Order data validation failed:', validation.errors)
      return NextResponse.json(
        { 
          error: 'Invalid order data', 
          validationErrors: validation.errors 
        },
        { status: 400 }
      )
    }

    console.log('🔄 Converting to VCA format...')
    // Convert order data to VCA format
    const vca = convertToVCA(orderData as OrderData)
    console.log('✅ VCA conversion completed')
    
    // Log the VCA string for inspection
    console.log('='.repeat(80))
    console.log('📋 ORDER SUBMISSION TO RXOFFICE EDI')
    console.log('='.repeat(80))
    console.log('🔹 Generated VCA String:')
    console.log(vca)
    console.log('')
    console.log('🔹 VCA Fields Breakdown:')
    const vcaFields = vca.split(';')
    vcaFields.forEach(field => {
      const equalIndex = field.indexOf('=')
      if (equalIndex > 0) {
        const key = field.substring(0, equalIndex)
        const value = field.substring(equalIndex + 1)
        console.log(`   ${key}: ${value}`)
      }
    })
    console.log('='.repeat(80))

    console.log('🔐 Processing credentials...')
    // Use provided credentials or fall back to environment variables
    const userName = credentials?.userName || RXOFFICE_CONFIG.userName
    const pwd = credentials?.password || RXOFFICE_CONFIG.password

    console.log(`🔹 Final username: ${userName}`)
    console.log(`🔹 Password length: ${pwd?.length || 0}`)

    if (!userName || !pwd) {
      console.log('❌ Missing credentials')
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    console.log(`🔹 Credentials: ${userName} / ${'*'.repeat(pwd.length)}`)

    if (USE_REAL_SOAP_SERVICE) {
      console.log('🌐 === ATTEMPTING REAL SOAP CONNECTION ===')
      // Real SOAP implementation (for when service is ready)
      try {
        console.log('🔗 Step 1: Connecting to SOAP service...')
        console.log('🔹 WSDL URL:', RXOFFICE_CONFIG.wsdlUrl)
        
        const client = await soap.createClientAsync(RXOFFICE_CONFIG.wsdlUrl, {
          disableCache: true
        })
        console.log('✅ Step 1: SOAP client created successfully')

        console.log('🔍 Step 2: Examining available methods...')
        const describedServices = client.describe()
        console.log('🔹 Service description:', JSON.stringify(describedServices, null, 2))
        console.log('🔹 Available SOAP methods:', Object.keys(describedServices))

        const soapParams = {
          userName: userName,
          pwd: pwd,
          vca: vca
        }

        console.log('📞 Step 3: Calling CreateOrder method...')
        console.log('🔹 SOAP parameters:', soapParams)
        
        const [result] = await client.CreateOrderAsync(soapParams)
        console.log('✅ Step 3: SOAP call completed')
        console.log('📥 Raw SOAP response:', JSON.stringify(result, null, 2))

        // Extract the actual result from the SOAP wrapper
        const soapResult = result.CreateOrderResult || result
        console.log('📥 Extracted result:', JSON.stringify(soapResult, null, 2))

        if (soapResult && soapResult.Status === 0) {
          console.log('🎉 SUCCESS: Order created successfully')
          console.log('🔹 Order ID/Data:', soapResult.Data)
          return NextResponse.json({
            success: true,
            message: 'Order created successfully',
            data: soapResult.Data,
            orderInfo: soapResult.OrderInfo || null,
            vca: vca
          })
        } else {
          console.log('⚠️ SOAP service returned error status')
          console.log('🔹 Status code:', soapResult?.Status)
          console.log('🔹 Error message:', soapResult?.Message)
          return NextResponse.json({
            success: false,
            message: soapResult?.Message || 'Unknown error from SOAP service',
            status: soapResult?.Status,
            vca: vca
          }, { status: 400 })
        }

      } catch (soapError: any) {
        console.log('💥 === SOAP ERROR OCCURRED ===')
        console.error('🔹 Error type:', soapError.constructor.name)
        console.error('🔹 Error message:', soapError.message)
        console.error('🔹 Error stack:', soapError.stack)
        console.error('🔹 Full error object:', soapError)
        
        if (soapError.response) {
          console.error('🔹 HTTP Response status:', soapError.response.status)
          console.error('🔹 HTTP Response headers:', soapError.response.headers)
        }
        
        if (soapError.body) {
          console.error('🔹 Error body:', soapError.body)
        }
        
        let errorMessage = 'SOAP service error'
        if (soapError.message) {
          errorMessage = soapError.message
        } else if (soapError.body) {
          errorMessage = `SOAP fault: ${soapError.body}`
        }

        console.log('📤 Returning SOAP error response')
        return NextResponse.json({
          success: false,
          error: errorMessage,
          details: soapError.toString(),
          vca: vca,
          debug: {
            errorType: soapError.constructor.name,
            wsdlUrl: RXOFFICE_CONFIG.wsdlUrl,
            timestamp: new Date().toISOString()
          }
        }, { status: 500 })
      }
    } else {
      console.log('🎭 === USING MOCK RESPONSE ===')
      // Mock response for testing
      console.log('🔹 Using mock response (real SOAP service disabled)')
      
      // Generate a mock order number
      const mockOrderNumber = `ORD-${Date.now().toString().slice(-8)}`
      
      // Simulate processing time
      console.log('⏳ Simulating processing delay...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log(`🔹 Mock order created: ${mockOrderNumber}`)
      console.log('='.repeat(80))

      return NextResponse.json({
        success: true,
        message: 'Order created successfully (MOCK)',
        data: mockOrderNumber,
        orderInfo: {
          orderNumber: mockOrderNumber,
          status: 'SUBMITTED',
          submittedAt: new Date().toISOString(),
          customerCode: orderData.CLIENT,
          estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        },
        vca: vca,
        mock: true // Indicates this is a mock response
      })
    }

  } catch (error: any) {
    console.log('💥 === GENERAL ERROR OCCURRED ===')
    console.error('🔹 Error in create-order-soap route:', error)
    console.error('🔹 Error message:', error.message)
    console.error('🔹 Error stack:', error.stack)
    console.error('🔹 Error type:', error.constructor.name)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        debug: {
          errorType: error.constructor.name,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  } finally {
    console.log('🏁 === CREATE ORDER SOAP ROUTE COMPLETED ===\n')
  }
}

// GET endpoint for testing SOAP connection
export async function GET() {
  console.log('\n🔍 === SOAP CONNECTION TEST ===')
  console.log('🔧 USE_REAL_SOAP_SERVICE:', USE_REAL_SOAP_SERVICE)
  console.log('🌐 WSDL URL:', RXOFFICE_CONFIG.wsdlUrl)
  
  if (USE_REAL_SOAP_SERVICE) {
    try {
      console.log('🔗 Testing SOAP connection...')
      const client = await soap.createClientAsync(RXOFFICE_CONFIG.wsdlUrl, {
        disableCache: true
      })
      console.log('✅ SOAP connection successful')

      const methods = Object.keys(client.describe())
      console.log('🔹 Available methods:', methods)
      
      return NextResponse.json({
        success: true,
        message: 'SOAP connection successful',
        wsdlUrl: RXOFFICE_CONFIG.wsdlUrl,
        availableMethods: methods,
        config: {
          userName: RXOFFICE_CONFIG.userName,
          hasPassword: !!RXOFFICE_CONFIG.password
        }
      })

    } catch (error: any) {
      console.error('❌ SOAP connection test failed:', error)
      console.error('🔹 Error message:', error.message)
      console.error('🔹 Error type:', error.constructor.name)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to SOAP service',
        details: error.message,
        wsdlUrl: RXOFFICE_CONFIG.wsdlUrl,
        debug: {
          errorType: error.constructor.name,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 })
    }
  } else {
    console.log('🎭 Mock mode enabled')
    return NextResponse.json({
      success: true,
      message: 'Mock mode enabled - SOAP service testing disabled',
      config: {
        mockMode: true,
        wsdlUrl: RXOFFICE_CONFIG.wsdlUrl,
        userName: RXOFFICE_CONFIG.userName,
        hasPassword: !!RXOFFICE_CONFIG.password
      }
    })
  }
} 