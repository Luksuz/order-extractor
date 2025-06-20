import { type NextRequest, NextResponse } from "next/server"
import { HumanMessage } from "@langchain/core/messages"
import { ChatOpenAI } from "@langchain/openai"
import { z } from "zod"

// Product catalog for hair accessories
const PRODUCT_CATALOG = [
  {
    id: "hb001",
    name: "Silk Ribbon Headband",
    price: 24.99,
    image: "https://images.unsplash.com/photo-1594736797933-d0c331ad3eb0?w=400&h=400&fit=crop",
    category: "Headband",
    description: "Luxurious silk ribbon headband with adjustable tie",
    suitableFor: {
      faceShapes: ["oval", "round", "square"],
      hairColors: ["blonde", "brunette", "black"],
      skinTones: ["warm", "cool", "neutral"]
    }
  },
  {
    id: "hb002", 
    name: "Wire Twist Headband",
    price: 18.99,
    image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&h=400&fit=crop",
    category: "Headband",
    description: "Bendable wire headband wrapped in soft fabric",
    suitableFor: {
      faceShapes: ["heart", "diamond", "oval"],
      hairColors: ["red", "blonde", "brunette"],
      skinTones: ["warm", "neutral"]
    }
  },
  {
    id: "cl001",
    name: "Pearl Hair Clips Set",
    price: 32.99,
    image: "https://images.unsplash.com/photo-1515688594390-b649af70d282?w=400&h=400&fit=crop",
    category: "Clips",
    description: "Set of 3 elegant pearl-adorned hair clips",
    suitableFor: {
      faceShapes: ["round", "square", "heart"],
      hairColors: ["black", "brunette", "blonde"],
      skinTones: ["cool", "neutral"]
    }
  },
  {
    id: "cl002",
    name: "Tortoiseshell Claw Clip",
    price: 16.99,
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",
    category: "Clips",
    description: "Classic tortoiseshell pattern claw clip",
    suitableFor: {
      faceShapes: ["oval", "diamond", "square"],
      hairColors: ["brunette", "red", "black"],
      skinTones: ["warm", "neutral"]
    }
  },
  {
    id: "sc001",
    name: "Velvet Scrunchie Set",
    price: 19.99,
    image: "https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=400&h=400&fit=crop",
    category: "Scrunchies",
    description: "Luxurious velvet scrunchies in earthy tones",
    suitableFor: {
      faceShapes: ["heart", "oval", "round"],
      hairColors: ["blonde", "brunette", "red"],
      skinTones: ["warm", "cool", "neutral"]
    }
  },
  {
    id: "sc002",
    name: "Satin Sleep Scrunchies",
    price: 14.99,
    image: "https://images.unsplash.com/photo-1634307814093-1b4f89021c40?w=400&h=400&fit=crop",
    category: "Scrunchies", 
    description: "Gentle satin scrunchies perfect for sleeping",
    suitableFor: {
      faceShapes: ["oval", "diamond", "heart"],
      hairColors: ["black", "brunette", "blonde"],
      skinTones: ["cool", "neutral"]
    }
  }
]

// Analysis result schema
const SelfieAnalysisSchema = z.object({
  hairColor: z.enum(["blonde", "brunette", "black", "red", "grey", "other"]).describe("Primary hair color visible in the image"),
  faceShape: z.enum(["oval", "round", "square", "heart", "diamond", "oblong"]).describe("Face shape based on facial structure"),
  skinTone: z.enum(["warm", "cool", "neutral"]).describe("Skin undertone - warm (yellow/golden), cool (pink/blue), or neutral"),
  hairLength: z.enum(["short", "medium", "long"]).describe("Approximate hair length"),
  hairTexture: z.enum(["straight", "wavy", "curly", "coily"]).describe("Hair texture/curl pattern"),
  confidence: z.number().min(0).max(1).describe("Confidence score for the analysis (0-1)")
})

function getProductRecommendations(analysis: z.infer<typeof SelfieAnalysisSchema>) {
  const { hairColor, faceShape, skinTone } = analysis
  
  // Score each product based on how well it matches
  const scoredProducts = PRODUCT_CATALOG.map(product => {
    let score = 0
    
    // Face shape match (most important)
    if (product.suitableFor.faceShapes.includes(faceShape)) score += 3
    
    // Hair color match
    if (product.suitableFor.hairColors.includes(hairColor)) score += 2
    
    // Skin tone match
    if (product.suitableFor.skinTones.includes(skinTone)) score += 2
    
    return { ...product, score }
  })
  
  // Sort by score and take top 3
  const topProducts = scoredProducts
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  
  // Generate match reasons
  return topProducts.map(product => ({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    category: product.category,
    description: product.description,
    matchReason: generateMatchReason(product, analysis)
  }))
}

function generateMatchReason(product: any, analysis: z.infer<typeof SelfieAnalysisSchema>) {
  const reasons = []
  
  if (product.suitableFor.faceShapes.includes(analysis.faceShape)) {
    reasons.push(`Perfect for ${analysis.faceShape} face shapes`)
  }
  
  if (product.suitableFor.hairColors.includes(analysis.hairColor)) {
    reasons.push(`Complements ${analysis.hairColor} hair beautifully`)
  }
  
  if (product.suitableFor.skinTones.includes(analysis.skinTone)) {
    reasons.push(`Matches your ${analysis.skinTone} skin tone`)
  }
  
  return reasons.join(" • ")
}

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

    console.log("=== Analyzing Selfie for Hair Accessories ===")
    console.log("File:", imageFile.name, "Size:", imageFile.size)

    // Convert image to base64
    const imageBuffer = await imageFile.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")

    // Initialize the LLM with structured output
    const llm = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0,
      maxTokens: 1000,
      apiKey: OPENAI_API_KEY,
    }).withStructuredOutput(SelfieAnalysisSchema)

    // Create the message for selfie analysis
    const message = new HumanMessage({
      content: [
        {
          type: "text",
          text: `Analyze this selfie to determine the person's features for hair accessory recommendations.

Please identify:

1. Hair Color: Determine the primary hair color from these options:
   - blonde (light yellow to golden tones)
   - brunette (brown tones from light to dark)
   - black (very dark brown to true black)
   - red (ginger, auburn, copper tones)
   - grey (silver, white, salt & pepper)
   - other (unusual colors, multiple colors)

2. Face Shape: Analyze the facial structure:
   - oval (balanced proportions, slightly longer than wide)
   - round (full cheeks, similar width and length)
   - square (strong jawline, angular features)
   - heart (wider forehead, narrower chin)
   - diamond (widest at cheekbones, narrow forehead and chin)
   - oblong (longer than wide, narrow throughout)

3. Skin Tone: Determine the undertone:
   - warm (yellow, golden, or peachy undertones)
   - cool (pink, red, or blue undertones)
   - neutral (balanced mix of warm and cool)

4. Hair Length:
   - short (above shoulders)
   - medium (shoulder to mid-back)
   - long (below mid-back)

5. Hair Texture:
   - straight (no curl or wave)
   - wavy (loose waves)
   - curly (defined curls)
   - coily (tight curls/coils)

6. Confidence: Rate your confidence in this analysis from 0.0 to 1.0

Focus on the most prominent and visible features. If something is unclear, make your best assessment based on what you can see.`,
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
    const analysis = await llm.invoke([message])

    console.log("Selfie analysis successful:", analysis)

    // Get product recommendations based on analysis
    const recommendations = getProductRecommendations(analysis)

    // Return the analysis and recommendations
    return NextResponse.json({
      success: true,
      data: {
        hairColor: analysis.hairColor,
        faceShape: analysis.faceShape,
        skinTone: analysis.skinTone,
        recommendations
      }
    })

  } catch (error) {
    console.error("Error analyzing selfie:", error)

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "An unknown error occurred",
        success: false
      },
      { status: 500 },
    )
  }
}
