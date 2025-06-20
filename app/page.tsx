"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, Sparkles, Camera } from "lucide-react"
import { Card } from "@/components/ui/card"

interface ProductRecommendation {
  id: string
  name: string
  price: number
  image: string
  category: string
  description: string
  matchReason: string
}

interface AnalysisResult {
  hairColor: string
  faceShape: string
  skinTone: string
  recommendations: ProductRecommendation[]
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleImageSelect = (file: File) => {
    setSelectedImage(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleImageSubmit = async () => {
    if (!selectedImage) return

    setIsLoading(true)
    setError(null)

    console.log("=== Analyzing Selfie ===")
    console.log("File:", selectedImage.name)

    try {
      // Create form data for the analyze-selfie API
      const formData = new FormData()
      formData.append('image', selectedImage)

      // Send to analyze-selfie API
      const response = await fetch("/api/analyze-selfie", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        throw new Error("Failed to analyze selfie")
      }

      const result = await response.json()
      console.log("Analysis result:", result)
      
      if (result.success && result.data) {
        console.log("Setting analysis result:", result.data)
        setAnalysisResult(result.data)
      } else {
        console.warn("No data found in result")
        throw new Error(result.error || "Could not analyze your selfie")
      }

    } catch (err) {
      console.error("Error analyzing selfie:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const clearAll = () => {
    setAnalysisResult(null)
    setSelectedImage(null)
    setImagePreview(null)
    setError(null)
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setAnalysisResult(null)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-sm border-b px-6 py-6 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-2 rounded-xl">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                HairStyle AI
              </h1>
              <p className="text-sm text-gray-600">
                AI-powered hair accessories just for you
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={clearAll} disabled={isLoading}>
              Clear All
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Hero Section */}
        {!selectedImage && (
          <div className="text-center py-12 mb-8">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Camera className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Find Your Perfect Hair Accessories
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Upload a selfie and let our AI analyze your hair color, face shape, and skin tone to recommend the perfect headbands, clips, and scrunchies just for you.
            </p>
          </div>
        )}

        {/* Upload Section */}
        <Card className="p-6 mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <div className="flex items-center gap-4">
            {!selectedImage ? (
              <div className="flex items-center gap-4 w-full justify-center">
                <Upload className="h-8 w-8 text-purple-400" />
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-900">Upload Your Selfie</p>
                  <p className="text-sm text-gray-500">JPG, PNG supported • Best with clear face view</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageSelect(file)
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isLoading}
                >
                  Choose Photo
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4 w-full">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-16 h-16 rounded-xl border-2 border-purple-200 overflow-hidden">
                    {imagePreview && (
                      <img 
                        src={imagePreview} 
                        alt="Selected" 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedImage.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button 
                  size="lg"
                  onClick={handleImageSubmit}
                  disabled={isLoading || !!analysisResult}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {isLoading ? "Analyzing..." : "Get Recommendations"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeImage}
                  disabled={isLoading}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <p className="text-red-600 text-center">{error}</p>
          </Card>
        )}

        {/* Results Section */}
        {analysisResult && (
          <div className="space-y-6">
            {/* Analysis Summary */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Your Style Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg">
                  <div className="text-2xl mb-2">💁‍♀️</div>
                  <p className="font-medium text-gray-900">Face Shape</p>
                  <p className="text-purple-600 font-semibold">{analysisResult.faceShape}</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
                  <div className="text-2xl mb-2">💫</div>
                  <p className="font-medium text-gray-900">Hair Color</p>
                  <p className="text-purple-600 font-semibold">{analysisResult.hairColor}</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-pink-50 rounded-lg">
                  <div className="text-2xl mb-2">✨</div>
                  <p className="font-medium text-gray-900">Skin Tone</p>
                  <p className="text-purple-600 font-semibold">{analysisResult.skinTone}</p>
                </div>
              </div>
            </Card>

            {/* Product Recommendations */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Recommended Just For You
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {analysisResult.recommendations.map((product, index) => (
                  <div key={product.id} className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
                    <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                          {product.category}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          ${product.price}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900">{product.name}</h4>
                      <p className="text-sm text-gray-600">{product.description}</p>
                      <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-3 rounded-lg">
                        <p className="text-xs font-medium text-purple-700 mb-1">Why it's perfect for you:</p>
                        <p className="text-xs text-purple-600">{product.matchReason}</p>
                      </div>
                      <Button 
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                        size="sm"
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  )
}
