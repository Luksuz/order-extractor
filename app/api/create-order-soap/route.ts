import { NextRequest, NextResponse } from 'next/server'
import * as soap from 'soap'
import { convertToVCA, validateOrderData, type OrderData } from '@/lib/vca-converter'

// RxOffice EDI Configuration
const RXOFFICE_CONFIG = {
  wsdlUrl: "http://advancelens.com.my/Services/CommonEDIService.svc?wsdl",
  userName: process.env.RXOFFICE_USERNAME || '380',
  password: process.env.RXOFFICE_PASSWORD || 'ZOHO123'
}

// SOAP Client Options with timeout configuration
const SOAP_OPTIONS = {
  disableCache: true,
  timeout: 30000, // 30 seconds timeout
  connectionTimeout: 15000, // 15 seconds connection timeout
  forceSoap12Headers: false,
  preserveWhitespace: false
}

// HTTP Agent options for better connection handling
const HTTP_AGENT_OPTIONS = {
  keepAlive: true,
  timeout: 30000,
  keepAliveMsecs: 1000,
  maxSockets: 5,
  maxFreeSockets: 2
}

// Debug environment variables
console.log('🔍 Environment Variables Debug:')
console.log('RXOFFICE_WSDL_URL:', process.env.RXOFFICE_WSDL_URL)
console.log('RXOFFICE_USERNAME:', process.env.RXOFFICE_USERNAME)
console.log('RXOFFICE_PASSWORD:', process.env.RXOFFICE_PASSWORD ? '***HIDDEN***' : 'undefined')

// Toggle for testing - set to true to use real SOAP service
const USE_REAL_SOAP_SERVICE = process.env.USE_REAL_SOAP_SERVICE === 'true' || true

// Timeout wrapper function
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

export async function POST(request: NextRequest) {
  console.log('\n🚀 === CREATE ORDER SOAP ROUTE STARTED ===')
  console.log('📅 Timestamp:', new Date().toISOString())
  console.log('🔧 USE_REAL_SOAP_SERVICE:', USE_REAL_SOAP_SERVICE)
  console.log('🌐 WSDL URL:', RXOFFICE_CONFIG.wsdlUrl)
  
  try {
    console.log('📝 Parsing request body...')
    const { orderData, credentials } = await request.json()
    console.log('✅ Request body parsed successfully')

    if (!orderData) {
      console.log('❌ No order data provided')
      return NextResponse.json(
        { error: 'Order data is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Validating order data...')
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
    const vca = convertToVCA(orderData as OrderData)
    console.log('✅ VCA conversion completed')
    
    // Log the VCA string for inspection (truncated for brevity)
    console.log('📋 Generated VCA String (first 200 chars):', vca.substring(0, 200) + '...')

    console.log('🔐 Processing credentials...')
    const userName = credentials?.userName || RXOFFICE_CONFIG.userName
    const pwd = credentials?.password || RXOFFICE_CONFIG.password

    if (!userName || !pwd) {
      console.log('❌ Missing credentials')
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    if (!RXOFFICE_CONFIG.wsdlUrl) {
      console.log('❌ Missing WSDL URL')
      return NextResponse.json(
        { error: 'WSDL URL not configured' },
        { status: 500 }
      )
    }

    if (USE_REAL_SOAP_SERVICE) {
      console.log('🌐 === ATTEMPTING REAL SOAP CONNECTION WITH TIMEOUT ===')
      
      try {
        console.log('🔗 Step 1: Creating SOAP client with timeout...')
        console.log('🔹 Using WSDL URL:', RXOFFICE_CONFIG.wsdlUrl)
        console.log('🔹 Timeout settings:', SOAP_OPTIONS)
        
        // Test WSDL URL accessibility first
        console.log('🌐 Step 1.1: Testing WSDL URL accessibility...')
        let wsdlAccessible = false;
        try {
          const testResponse = await withTimeout(
            fetch(RXOFFICE_CONFIG.wsdlUrl, { 
              method: 'GET',
              headers: {
                'User-Agent': 'Node.js SOAP Client'
              }
            }),
            10000 // 10 second timeout for WSDL test
          )
          console.log('🔹 WSDL URL status:', testResponse.status)
          console.log('🔹 WSDL URL accessible:', testResponse.ok)
          wsdlAccessible = testResponse.ok;
          
          if (!testResponse.ok) {
            console.log('⚠️ WSDL URL returned error status:', testResponse.statusText)
          } else {
            console.log('✅ WSDL URL is accessible via HTTP')
          }
        } catch (fetchError: any) {
          console.log('⚠️ Could not fetch WSDL URL via HTTP:', fetchError.message)
          console.log('🔄 This might be normal - SOAP client may handle WSDL differently')
          console.log('🔄 Proceeding with SOAP client creation anyway...')
        }
        
        // Create SOAP client with timeout
        console.log('🔗 Step 1.2: Creating SOAP client...')
        console.log('🔹 Will attempt SOAP client creation regardless of HTTP test result')
        
        let client;
        try {
          client = await withTimeout(
            soap.createClientAsync(RXOFFICE_CONFIG.wsdlUrl, SOAP_OPTIONS),
            45000 // 45 second timeout for client creation
          )
          console.log('✅ Step 1.2: SOAP client created successfully')
        } catch (clientError: any) {
          console.log('❌ Failed to create SOAP client:', clientError.message)
          console.log('🔹 Error type:', clientError.constructor.name)
          
          // If WSDL is not accessible, provide helpful error message
          if (!wsdlAccessible) {
            throw new Error(`WSDL URL is not accessible: ${RXOFFICE_CONFIG.wsdlUrl}. Please check if the server is running and the URL is correct.`)
          } else {
            throw clientError;
          }
        }

        // Set Basic Authentication Security (proper SOAP way)
        console.log('🔐 Step 1.5: Setting SOAP Basic Authentication...')
        client.setSecurity(new soap.BasicAuthSecurity(userName, pwd))
        console.log('✅ Step 1.5: SOAP Basic Auth configured')

        // Unable to set additional timeout directly on the client due to private property.
        // If you need to set a timeout, pass it via SOAP_OPTIONS when creating the client.

        console.log('🔍 Step 2: Examining available methods...');
        const describedServices = client.describe()
        const serviceNames = Object.keys(describedServices)
        console.log('🔹 Available services:', serviceNames)

        // Log all available methods for debugging
        console.log('🔍 Step 2.1: Detailed service inspection...')
        try {
          const fullDescription = JSON.stringify(describedServices, null, 2)
          console.log('📋 Full service description:', fullDescription)
        } catch (descError) {
          console.log('⚠️ Could not stringify service description:', descError)
        }

        // Check if CreateOrder method exists
        console.log('🔍 Step 2.2: Checking for CreateOrder method...')
        const hasCreateOrder = typeof client.CreateOrder === 'function'
        const hasCreateOrderAsync = typeof client.CreateOrderAsync === 'function'
        console.log('🔹 Has CreateOrder method:', hasCreateOrder)
        console.log('🔹 Has CreateOrderAsync method:', hasCreateOrderAsync)

        if (!hasCreateOrderAsync && !hasCreateOrder) {
          console.log('❌ CreateOrder method not found in SOAP client!')
          console.log('🔹 Available methods:', Object.getOwnPropertyNames(client).filter(name => typeof client[name] === 'function'))
          throw new Error('CreateOrder method not available in SOAP service')
        }

        const soapParams = {
          userName: userName,
          pwd: pwd,
          vca: vca
        }

        console.log('📞 Step 3: Calling CreateOrder method with timeout...')
        console.log('🔹 Parameters prepared for SOAP call')
        
        // Generate and log XML before sending
        try {
          console.log('🔥 === GENERATING XML PREVIEW (BEFORE CONNECTION) ===')
          
          // Manually construct the expected SOAP XML for preview
          const previewXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tem:CreateOrder>
      <tem:userName>${userName}</tem:userName>
      <tem:pwd>${pwd}</tem:pwd>
      <tem:vca>${vca}</tem:vca>
    </tem:CreateOrder>
  </soap:Body>
</soap:Envelope>`
          
          console.log('📋 Expected SOAP XML structure:')
          console.log(previewXml)
          console.log('')
          console.log('📊 XML Details:')
          console.log('- Username:', userName)
          console.log('- Password length:', pwd?.length || 0, 'characters')
          console.log('- VCA length:', vca.length, 'characters')
          console.log('- VCA preview (first 300 chars):', vca.substring(0, 300) + '...')
          console.log('🔥 === END XML PREVIEW ===')
          
        } catch (previewError) {
          console.log('⚠️ Could not generate XML preview:', previewError)
        }
        
        // Add request logging
        client.on('request', (xml: string) => {
          console.log('🔥 === ACTUAL SOAP REQUEST BEING SENT ===')
          console.log('Request length:', xml.length, 'characters')
          console.log('Full XML:')
          console.log(xml)
          console.log('🔥 === END ACTUAL SOAP REQUEST ===')
        })

        client.on('response', (body: string, response: any) => {
          console.log('📥 === SOAP RESPONSE RECEIVED ===')
          console.log('Response status:', response?.statusCode)
          console.log('Response length:', body?.length, 'characters')
          console.log('First 500 chars:', body?.substring(0, 500))
          console.log('📥 === END SOAP RESPONSE ===')
        })

        // Call SOAP method with timeout - using destructuring as per example
        console.log('🚀 Step 3.1: About to call CreateOrderAsync...')
        console.log('🔹 Method exists:', typeof client.CreateOrderAsync === 'function')
        console.log('🔹 Parameters:', JSON.stringify(soapParams, null, 2))
        
        console.log('⏳ Step 3.2: Starting SOAP call with 60s timeout...')
        const startTime = Date.now()
        
        let soapResponse;
        
        try {
          soapResponse = await withTimeout(
            (async () => {
              console.log('🔄 Inside SOAP call wrapper...')
              const response = await client.CreateOrderAsync(soapParams)
              console.log('✅ SOAP call returned, processing response...')
              return response
            })(),
            60000 // 60 second timeout for the actual SOAP call
          );
        } catch (asyncError: any) {
          console.log('⚠️ Async call failed, trying synchronous method...')
          console.log('🔹 Async error:', asyncError.message)
          
          // Try synchronous version as fallback
          if (typeof client.CreateOrder === 'function') {
            console.log('🔄 Attempting synchronous CreateOrder call...')
            soapResponse = await withTimeout(
              new Promise((resolve, reject) => {
                client.CreateOrder(soapParams, (err: any, result: any) => {
                  if (err) {
                    console.log('❌ Synchronous call error:', err)
                    reject(err)
                  } else {
                    console.log('✅ Synchronous call success')
                    resolve(result)
                  }
                })
              }),
              60000
            );
          } else {
            throw asyncError; // Re-throw if no sync method available
          }
        }
        
        const endTime = Date.now()
        console.log(`⏱️ SOAP call took ${endTime - startTime}ms`)
        
        // Extract result from SOAP response (could be array or object)
        const processedResponse = Array.isArray(soapResponse) ? soapResponse[0] : soapResponse;
        
        // Handle the CreateOrderResult wrapper structure
        const result = processedResponse.CreateOrderResult || processedResponse;
        
        console.log('✅ Step 3: SOAP call completed successfully')
        console.log('📥 SOAP response received')
        console.log('🔹 Response type:', typeof processedResponse)
        console.log('🔹 Response keys:', Object.keys(processedResponse || {}))
        console.log('🔹 Full SOAP response:', JSON.stringify(processedResponse, null, 2))
        console.log('🔹 Extracted result:', JSON.stringify(result, null, 2))

        // Process result - check Status directly as per example
        if (result.Status === 0) {
          console.log('🎉 SUCCESS: Order created successfully')
          return NextResponse.json({
            success: true,
            message: 'Order created successfully',
            data: result.Data,
            orderInfo: result.OrderInfo || null,
            vca: vca
          })
        } else {
          console.log('⚠️ SOAP service returned error status')
          console.log('🔹 Status code:', result.Status)
          console.log('🔹 Error message:', result.Message)
          return NextResponse.json({
            success: false,
            message: result.Message || 'Unknown error from SOAP service',
            status: result.Status,
            vca: vca
          }, { status: 400 })
        }

      } catch (soapError: any) {
        console.log('💥 === SOAP ERROR OCCURRED ===')
        console.error('🔹 Error type:', soapError.constructor.name)
        console.error('🔹 Error message:', soapError.message)
        
        // Check if it's a timeout error
        const isTimeout = soapError.message?.includes('timeout') || 
                         soapError.message?.includes('ETIMEDOUT') ||
                         soapError.message?.includes('ESOCKETTIMEDOUT') ||
                         soapError.code === 'ETIMEDOUT'

        if (isTimeout) {
          console.error('⏰ This appears to be a TIMEOUT error')
          return NextResponse.json({
            success: false,
            error: 'Request timed out - the SOAP service is taking too long to respond',
            errorType: 'TIMEOUT',
            message: 'The request to RxOffice EDI service timed out. Please try again or contact support if the issue persists.',
            vca: vca,
            debug: {
              errorType: soapError.constructor.name,
              wsdlUrl: RXOFFICE_CONFIG.wsdlUrl,
              timestamp: new Date().toISOString(),
              timeoutSettings: SOAP_OPTIONS
            }
          }, { status: 408 }) // 408 Request Timeout
        }

        // Handle other SOAP errors
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
      const mockOrderNumber = `ORD-${Date.now().toString().slice(-8)}`
      
      // Simulate processing time
      console.log('⏳ Simulating processing delay...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return NextResponse.json({
        success: true,
        message: 'Order created successfully (MOCK)',
        data: mockOrderNumber,
        orderInfo: {
          orderNumber: mockOrderNumber,
          status: 'SUBMITTED',
          submittedAt: new Date().toISOString(),
          customerCode: orderData.CLIENT,
          estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        vca: vca,
        mock: true
      })
    }

  } catch (error: any) {
    console.log('💥 === GENERAL ERROR OCCURRED ===')
    console.error('🔹 Error in create-order-soap route:', error)
    
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

// Updated GET endpoint with timeout handling
export async function GET() {
  console.log('\n🔍 === SOAP CONNECTION TEST WITH TIMEOUT ===')
  console.log('🔧 USE_REAL_SOAP_SERVICE:', USE_REAL_SOAP_SERVICE)
  console.log('🌐 WSDL URL:', RXOFFICE_CONFIG.wsdlUrl)
  
  if (USE_REAL_SOAP_SERVICE && RXOFFICE_CONFIG.wsdlUrl) {
    try {
      console.log('🔗 Testing SOAP connection with timeout...')
      
      const client = await withTimeout(
        soap.createClientAsync(RXOFFICE_CONFIG.wsdlUrl, SOAP_OPTIONS),
        30000 // 30 second timeout for connection test
      )
      
      console.log('✅ SOAP connection successful')

      // Set Basic Authentication for testing
      if (RXOFFICE_CONFIG.userName && RXOFFICE_CONFIG.password) {
        console.log('🔐 Setting Basic Auth for test connection...')
        client.setSecurity(new soap.BasicAuthSecurity(RXOFFICE_CONFIG.userName, RXOFFICE_CONFIG.password))
        console.log('✅ Basic Auth configured for test')
      }

      const methods = Object.keys(client.describe())
      console.log('🔹 Available methods:', methods)
      
      return NextResponse.json({
        success: true,
        message: 'SOAP connection successful',
        wsdlUrl: RXOFFICE_CONFIG.wsdlUrl,
        availableMethods: methods,
        timeoutSettings: SOAP_OPTIONS,
        config: {
          userName: RXOFFICE_CONFIG.userName,
          hasPassword: !!RXOFFICE_CONFIG.password
        }
      })

    } catch (error: any) {
      console.error('❌ SOAP connection test failed:', error)
      
      const isTimeout = error.message?.includes('timeout') || 
                       error.message?.includes('ETIMEDOUT')
      
      return NextResponse.json({
        success: false,
        error: isTimeout ? 'Connection timed out' : 'Failed to connect to SOAP service',
        details: error.message,
        wsdlUrl: RXOFFICE_CONFIG.wsdlUrl,
        timeoutSettings: SOAP_OPTIONS,
        debug: {
          errorType: error.constructor.name,
          isTimeout: isTimeout,
          timestamp: new Date().toISOString()
        }
      }, { status: isTimeout ? 408 : 500 })
    }
  } else {
    console.log('🎭 Mock mode enabled or missing WSDL URL')
    return NextResponse.json({
      success: true,
      message: RXOFFICE_CONFIG.wsdlUrl ? 'Mock mode enabled' : 'WSDL URL not configured',
      config: {
        mockMode: !USE_REAL_SOAP_SERVICE,
        wsdlUrl: RXOFFICE_CONFIG.wsdlUrl,
        userName: RXOFFICE_CONFIG.userName,
        hasPassword: !!RXOFFICE_CONFIG.password
      }
    })
  }
}