"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import ImageExtractorForm from "@/components/image-extractor-form"

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractedOrder, setExtractedOrder] = useState<any | null>(null)
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

    console.log("=== Processing Image ===")
    console.log("File:", selectedImage.name)

    try {
      // Create form data for the extract-order API
      const formData = new FormData()
      formData.append('image', selectedImage)

      // Send to extract-order API
      const response = await fetch("/api/extract-order", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        throw new Error("Failed to process image")
      }

      const result = await response.json()
      console.log("Extraction result:", result)
      
      if (result.success && result.data) {
        console.log("Setting extracted order data:", result.data)
        setExtractedOrder(result.data)
      } else {
        console.warn("No data found in result")
        throw new Error(result.error || "Could not extract order data from image")
      }

    } catch (err) {
      console.error("Error processing image:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = async (orderData: any) => {
    setIsLoading(true)
    setError(null)

    console.log("=== Submitting Order to External API ===")
    console.log("Order data:", orderData)

    try {
      // TODO: Replace with your actual external API endpoint
      const response = await fetch("/api/external-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        throw new Error("Failed to submit order")
      }

      const result = await response.json()
      console.log("Submission result:", result)

      // Clear form after successful submission
      setExtractedOrder(null)
      setSelectedImage(null)
      setImagePreview(null)

    } catch (err) {
      console.error("Error submitting order:", err)
      setError(err instanceof Error ? err.message : "Failed to submit order")
    } finally {
      setIsLoading(false)
    }
  }

  const clearAll = () => {
    setExtractedOrder(null)
    setSelectedImage(null)
    setImagePreview(null)
    setError(null)
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setExtractedOrder(null)
  }

  return (
    <main className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">RxOffice Image Extractor</h1>
            <p className="text-sm text-gray-600">
              Upload prescription images and extract order data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={clearAll} disabled={isLoading}>
              Clear All
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 flex flex-col gap-4">
        {/* Small Upload Section */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            {!selectedImage ? (
              <div className="flex items-center gap-4">
                <Upload className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">Upload Prescription Image</p>
                  <p className="text-xs text-gray-500">JPG, PNG, PDF supported</p>
                </div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageSelect(file)
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isLoading}
                >
                  Select Image
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4 w-full">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-12 h-12 rounded border overflow-hidden">
                    {imagePreview && (
                      <img 
                        src={imagePreview} 
                        alt="Selected" 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedImage.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleImageSubmit}
                  disabled={isLoading || !!extractedOrder}
                  className="shrink-0"
                >
                  {isLoading ? "Processing..." : "Extract Data"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeImage}
                  disabled={isLoading}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Main Content Area */}
        {imagePreview && (
          <div className="flex-1 flex gap-6">
            {/* Left Half - Image Preview */}
            <div className="w-1/2">
              <Card className="h-full p-4">
                <h3 className="text-lg font-semibold mb-4">Image Preview</h3>
                <div className="h-full flex items-center justify-center">
                  <img 
                    src={imagePreview} 
                    alt="Prescription" 
                    className="max-w-full max-h-full object-contain rounded border"
                  />
                </div>
              </Card>
            </div>

            {/* Right Half - Extracted Form */}
            <div className="w-1/2">
              <ImageExtractorForm
                orderData={extractedOrder}
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                error={error}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
