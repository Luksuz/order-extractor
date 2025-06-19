import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()

    console.log("=== External API Submit ===")
    console.log("Received order data:", orderData)

    // TODO: Replace this with your actual external API call
    // Example:
    // const response = await fetch("https://your-external-api.com/orders", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": "Bearer YOUR_API_KEY"
    //   },
    //   body: JSON.stringify(orderData)
    // })
    //
    // if (!response.ok) {
    //   throw new Error(`External API error: ${response.status}`)
    // }
    //
    // const result = await response.json()
    // return NextResponse.json(result)

    // For now, simulate a successful response
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay

    const mockResponse = {
      success: true,
      orderId: orderData.JOB || `ORD${Date.now().toString().slice(-6)}`,
      message: "Order submitted successfully",
      timestamp: new Date().toISOString(),
      submittedData: orderData
    }

    console.log("Mock response:", mockResponse)

    return NextResponse.json(mockResponse)

  } catch (error) {
    console.error("Error submitting to external API:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "External API submission failed",
        success: false
      },
      { status: 500 }
    )
  }
} 