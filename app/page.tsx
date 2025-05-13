"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ImageUploader from "@/components/image-uploader"
import JsonViewer from "@/components/json-viewer"

export default function Home() {
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageUpload = (file: File) => {
    setImage(file)
    setOrderData(null)
    setError(null)

    // Create image preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const processImage = async () => {
    if (!image) return

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("image", image)

      const response = await fetch("/api/extract-order", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process image")
      }

      const data = await response.json()
      setOrderData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const downloadJson = () => {
    if (!orderData) return

    const dataStr = JSON.stringify(orderData, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const downloadLink = document.createElement("a")
    downloadLink.setAttribute("href", dataUri)
    downloadLink.setAttribute("download", "order-data.json")
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8">WhatsApp Order Extractor</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Upload WhatsApp Screenshot</h2>
          <ImageUploader onImageUpload={handleImageUpload} />

          {imagePreview && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Preview</h3>
              <div className="relative aspect-auto max-h-[300px] overflow-hidden rounded-md border">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="WhatsApp chat preview"
                  className="object-contain w-full h-full"
                />
              </div>
              <Button className="w-full mt-4" onClick={processImage} disabled={isLoading}>
                {isLoading ? "Processing..." : "Extract Order Data"}
              </Button>
            </div>
          )}

          {error && <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">{error}</div>}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Extracted Order Data</h2>

          {orderData ? (
            <div className="space-y-4">
              <Tabs defaultValue="preview">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-4">
                  <JsonViewer data={orderData} />
                </TabsContent>
                <TabsContent value="json" className="mt-4">
                  <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[400px] text-sm">
                    {JSON.stringify(orderData, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>

              <Button className="w-full" onClick={downloadJson} variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] bg-gray-100 rounded-md">
              <p className="text-gray-500">
                {isLoading ? "Processing image..." : "Upload and process an image to see results"}
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6 bg-blue-50">
        <h2 className="text-xl font-semibold mb-2">About This Tool</h2>
        <p className="text-gray-700">
          This application uses OpenAI's vision language model to extract order information from WhatsApp screenshots.
          It offers reduced complexity with no separate OCR processing - just LLM capabilities in a single request. This
          approach is very cost-effective, approximately $0.50 per 300 images processed.
        </p>
      </Card>
    </main>
  )
}
