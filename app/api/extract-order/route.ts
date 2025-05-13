import { type NextRequest, NextResponse } from "next/server"
import { HumanMessage } from "@langchain/core/messages"
import { ChatOpenAI } from "@langchain/openai"
import { z } from "zod"

// Define Lens Order schema using Zod
const LensOrderSchema = z.object({
  LensType: z.string().describe("Type of lens ordered"),
  Prescription: z.object({
    RightEye: z.object({
      SPH: z.string().describe("Spherical value for right eye"),
      CYL: z.string().describe("Cylindrical value for right eye"),
      AXIS: z.string().describe("Axis value for right eye"),
      ADD: z.string().describe("Addition value for right eye"),
    }),
    LeftEye: z.object({
      SPH: z.string().describe("Spherical value for left eye"),
      CYL: z.string().describe("Cylindrical value for left eye"),
      AXIS: z.string().describe("Axis value for left eye"),
      ADD: z.string().describe("Addition value for left eye"),
    }),
  }),
  PD: z.string().describe("Pupillary distance"),
  FrameDetails: z.object({
    Size: z.string().describe("Frame size"),
    Height: z.string().describe("Frame height"),
    Type: z.string().describe("Frame type"),
  }),
  ReferenceNumber: z.string().describe("Order reference number"),
  Remarks: z.string().describe("Any remarks or special instructions"),
  CustomerName: z.string().describe("Name of the customer"),
})

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 })
    }

    // Get form data from the request
    const formData = await request.formData()
    const imageFile = formData.get("image") as File

    if (!imageFile) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 })
    }

    // Convert image to base64
    const imageBuffer = await imageFile.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")

    // Initialize the LLM with structured output
    const llm = new ChatOpenAI({
      modelName: "gpt-4.1-mini",
      temperature: 0,
      maxTokens: 1500,
      apiKey: OPENAI_API_KEY,
    }).withStructuredOutput(LensOrderSchema)

    // Create the message with text and image
    const message = new HumanMessage({
      content: [
        {
          type: "text",
          text:
            "Extract the lens order details from this WhatsApp screenshot. " +
            "Return the result as a JSON object with the following fields: " +
            "LensType, Prescription (with RightEye: SPH, CYL, AXIS, ADD; LeftEye: SPH, CYL, AXIS, ADD), " +
            "PD, FrameDetails (Size, Height, Type), ReferenceNumber, Remarks, CustomerName.",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`,
          },
        },
      ],
    })

    // Process the image with LangChain
    const response = await llm.invoke([message])

    // Return the extracted data
    return NextResponse.json(response)
  } catch (error) {
    console.error("Error processing image:", error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
