import { type NextRequest, NextResponse } from "next/server"
import { HumanMessage } from "@langchain/core/messages"
import { ChatOpenAI } from "@langchain/openai"
import { z } from "zod"

// VCA Order Schema for structured extraction
const VCAOrderSchema = z.object({
  DO: z.string().default("B").describe("Eyes: B=Both, R=Right, L=Left"),
  JOB: z.string().nullable().optional().describe("Customer ERP System Order Number"),
  SHOPNUMBER: z.string().optional().describe("The customer's company name or customer code if available"),
  CLIENT: z.string().optional().describe("Wearer's Name"),
  CLIENTF: z.string().optional().describe("Wearer's Name Abbreviation"),
  LNAM: z.string().optional().describe("Lens Code (format: right;left, e.g., 'OVMDXV;OVMDXV')"),
  SPH: z.string().optional().describe("Sphere values (format: right;left, e.g., '-1.75;-1.75')"),
  CYL: z.string().optional().describe("Cylinder values (format: right;left, e.g., '-0.5;-0.25')"),
  AX: z.string().optional().describe("Axis values (format: right;left, e.g., '45;180')"),
  ADD: z.string().optional().describe("Add Power values (format: right;left, e.g., '1.75;1.75')"),
  CRIB: z.string().optional().describe("Diameter 1 (format: right;left, e.g., '70;70')"),
  ELLH: z.string().optional().describe("Diameter 2 (format: right;left, e.g., '70;70')"),
  PRVM: z.string().optional().describe("Prescription Prism (format: right;left, e.g., '0;0')"),
  PRVA: z.string().optional().describe("Prescription Prism Base Direction (format: right;left, e.g., '0;0')"),
  IPD: z.string().optional().describe("Interpupillary Distance Far (format: right;left, e.g., '30.5;30.5')"),
  NPD: z.string().optional().describe("Near Pupillary Distance (format: right;left, e.g., '28.57;28.57')"),
  HBOX: z.string().optional().describe("Frame Width (format: right;left, e.g., '44.95;44.97')"),
  VBOX: z.string().optional().describe("Frame Height (format: right;left, e.g., '39.96;40.01')"),
  DBL: z.string().optional().describe("Distance Between Lenses - Bridge Width (single value, e.g., '20')"),
  FED: z.string().optional().describe("Frame Effective Diameter Diagonal (format: right;left, e.g., '49.84;49.92')"),
  BVD: z.string().optional().describe("Back Vertex Distance (format: right;left, e.g., '13;13')"),
  PANTO: z.string().optional().describe("Pantoscopic Tilt (format: right;left)"),
  ZTILT: z.string().optional().describe("Face Form Tilt - Lens Surface Curve (format: right;left)"),
  MBASE: z.string().optional().describe("Marked Base Curve (must be either 'right' or 'left' if exists)"),
  SEGHT: z.string().optional().describe("Segment Height (format: right;left, e.g., '28.04;28.02')"),
  BCERIN: z.string().optional().describe("Horizontal Decentration In/Out (format: right;left, e.g., '0;0')"),
  BCERUP: z.string().optional().describe("Vertical Decentration Up/Down (format: right;left, e.g., '0;0')"),
  MINTHKCD: z.string().optional().describe("Minimum Edge/Center Thickness (format: right;left, e.g., '0.51;0.51')"),
  MINCTR: z.string().optional().describe("Minimum Center Thickness (format: right;left, e.g., '1.64;1.64')"),
  TINT: z.string().optional().describe("Tint Code"),
  ACOAT: z.string().optional().describe("Coating Code (format: right;left, e.g., 'PT GREEN;PT GREEN')"),
  PRVIN: z.string().optional().describe("Horizontal Prism Direction (format: right;left, e.g., '3;2')"),
  PRVUP: z.string().optional().describe("Vertical Prism Direction (format: right;left, e.g., '1.5;1')"),
  COLR: z.string().optional().describe("Color Code (format: right;left, e.g., 'Gray;Gray')"),
  ShopNumber: z.string().optional().describe("ERP Query Number"),
  CustomerRetailName: z.string().nullable().optional().describe("The retail name of the customer")
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

    console.log("=== Processing Single Image with VCA Extraction ===")
    console.log("File:", { name: imageFile.name, size: imageFile.size })

    // Convert image to base64
    const imageBuffer = await imageFile.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")

    // Initialize the LLM with structured output
    const llm = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0,
      maxTokens: 5000,
      apiKey: OPENAI_API_KEY,
    }).withStructuredOutput(VCAOrderSchema)

    // Create the message with comprehensive VCA extraction prompt
    const message = new HumanMessage({
      content: [
        {
          type: "text",
          text: `Extract prescription and order information from this image in VCA format.

Analyze the provided image to extract the most complete prescription data possible. Look for the following information and format it correctly:

Basic Information:
- DO: Eyes (B=Both, R=Right, L=Left) - default "B"
- JOB: Customer ERP System Order Number
- SHOPNUMBER: The customer's company name or customer code if name is not available (e.g., "MS OPTOMETRY SDN BHD")
- CLIENT: Wearer's full name
- CLIENTF: Wearer's name abbreviation/initials

Prescription Values (use right;left format):
- SPH: Sphere values (e.g., "-1.75;-1.75")
- CYL: Cylinder values (e.g., "-0.5;-0.25")
- AX: Axis values (e.g., "45;180")
- ADD: Add Power values (e.g., "1.75;1.75")
- PRVM: Prescription Prism (e.g., "0;0")
- PRVA: Prescription Prism Base Direction (e.g., "0;0")
- PRVIN: Horizontal Prism Direction (e.g., "3;2")
- PRVUP: Vertical Prism Direction (e.g., "1.5;1")

Frame & Measurements (use right;left format where applicable):
- IPD: Interpupillary Distance Far (e.g., "30.5;30.5")
- NPD: Near Pupillary Distance (e.g., "28.57;28.57")
- HBOX: Frame Width (e.g., "44.95;44.97")
- VBOX: Frame Height (e.g., "39.96;40.01")
- DBL: Bridge Width (single value, e.g., "20")
- FED: Frame Effective Diameter (e.g., "49.84;49.92")
- SEGHT: Segment Height (e.g., "28.04;28.02")
- BVD: Back Vertex Distance (e.g., "13;13")

Advanced Specifications:
- LNAM: Lens Code 
- TINT: Tint Code
- ACOAT: Coating Code (e.g., "PT GREEN;PT GREEN")
- COLR: Color Code (e.g., "Gray;Gray")
- PANTO: Pantoscopic Tilt
- ZTILT: Face Form Tilt
- MBASE: Marked Base Curve
- CRIB: Diameter 1 (e.g., "70;70")
- ELLH: Diameter 2 (e.g., "70;70")
- BCERIN: Horizontal Decentration (e.g., "0;0")
- BCERUP: Vertical Decentration (e.g., "0;0")
- MINTHKCD: Minimum Edge/Center Thickness (e.g., "0.51;0.51")
- MINCTR: Minimum Center Thickness (e.g., "1.64;1.64")
- CustomerRetailName: Terminal Sales Product Name

Important formatting rules:
- Use semicolon (;) to separate right and left eye values
- Leave fields empty if not visible in the image
- For single eye prescriptions, use appropriate format
- Extract all visible text and numbers accurately`,
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
    console.log('Processing single image...')
    const response = await llm.invoke([message])

    console.log("VCA extraction successful:", response)

    // Return the extracted VCA data
    return NextResponse.json({
      success: true,
      data: response,
      metadata: {
        fileName: imageFile.name,
        fileSize: imageFile.size
      }
    })

  } catch (error) {
    console.error("Error processing image:", error)

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "An unknown error occurred",
        success: false
      },
      { status: 500 },
    )
  }
}
