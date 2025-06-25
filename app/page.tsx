"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, FileImage, CheckCircle, Clock, ArrowLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import ImageExtractorForm from "@/components/image-extractor-form"
import { toast } from "sonner"

type AppState = 'upload' | 'form'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('upload')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractedOrder, setExtractedOrder] = useState<any | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // Zoom functionality state
  const [isZooming, setIsZooming] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })
  const [zoomBackgroundPosition, setZoomBackgroundPosition] = useState({ x: 0, y: 0 })

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleImageSelect(files[0])
    }
  }

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error("Invalid File", {
        description: "Only image files (JPG, PNG, WEBP) and PDF files are supported.",
        duration: 4000
      })
      return
    }
    
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
        setAppState('form')
        
        toast.success("Image Processed Successfully!", {
          description: `Prescription data extracted from ${selectedImage.name}`,
          duration: 4000
        })
      } else {
        console.warn("No data found in result")
        const errorMessage = result.error || "Could not extract order data from image"
        setError(errorMessage)
        toast.error("Image Processing Failed", {
          description: errorMessage,
          duration: 5000
        })
      }

    } catch (err) {
      console.error("Error processing image:", err)
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred"
      setError(errorMessage)
      
      toast.error("Image Processing Error", {
        description: errorMessage,
        duration: 5000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = async (orderData: any) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/create-order-soap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderData,
          credentials: {
            userName: orderData.rxoffice_username,
            password: orderData.rxoffice_password
          }
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Order Created Successfully!", {
          description: result.message || "Your prescription order has been submitted.",
          duration: 5000
        })
        
        // Reset the app state
        resetApp()
      } else {
        const errorMessage = result.error || result.message || "Failed to create order"
        setError(errorMessage)
        toast.error("Order Creation Failed", {
          description: errorMessage,
          duration: 5000
        })
      }
    } catch (err) {
      console.error("Error creating order:", err)
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred"
      setError(errorMessage)
      
      toast.error("Order Creation Error", {
        description: errorMessage,
        duration: 5000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetApp = () => {
    setAppState('upload')
    setSelectedImage(null)
    setImagePreview(null)
    setExtractedOrder(null)
    setError(null)
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setError(null)
  }

  // Zoom handlers
  const handleMouseEnter = () => {
    setIsZooming(true)
  }

  const handleMouseLeave = () => {
    setIsZooming(false)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Calculate the percentage position
    const xPercent = (x / rect.width) * 100
    const yPercent = (y / rect.height) * 100
    
    // Position the zoom lens
    setZoomPosition({
      x: x - 75, // Half of zoom lens size (150px / 2)
      y: y - 75
    })
    
    // Calculate background position for zoomed image
    // For true 4x zoom, we need to offset the background position more precisely
    setZoomBackgroundPosition({
      x: xPercent,
      y: yPercent
    })
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation Bar */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <FileImage className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                WhatsApp Order Extractor
              </h1>
            </div>
            
            {appState === 'form' && (
              <Button
                variant="outline"
                onClick={resetApp}
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Upload
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {appState === 'upload' ? (
          /* Upload Stage */
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
              {/* Welcome Section */}
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                  <FileImage className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Transform Prescriptions with AI
                </h2>
                <p className="text-gray-600">
                  Upload a prescription image to automatically extract order data
                </p>
              </div>

              {/* Upload Area */}
              <Card className="overflow-hidden border-0 shadow-lg bg-white/50 backdrop-blur-sm">
                <div className="p-6">
                  {!selectedImage ? (
                    <div 
                      className={`text-center py-12 border-2 border-dashed rounded-lg transition-colors ${
                        isDragging 
                          ? 'border-blue-500 bg-blue-50/50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
                        <Upload className="h-8 w-8 text-blue-600" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Drop your prescription image here
                      </h3>
                      <p className="text-gray-500 mb-6">
                        or click to browse files
                      </p>
                      
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
                        size="lg"
                        onClick={() => document.getElementById('file-upload')?.click()}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3"
                      >
                        <Upload className="mr-2 h-5 w-5" />
                        Select Prescription Image
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Image Preview */}
                      <div className="relative bg-gray-50 rounded-lg overflow-hidden">
                        {imagePreview && (
                          <img 
                            src={imagePreview} 
                            alt="Prescription preview" 
                            className="w-full h-64 object-contain"
                          />
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeImage}
                          disabled={isLoading}
                          className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600/90 text-white h-8 w-8 p-0 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* File Info */}
                      <div className="text-center">
                        <p className="font-medium text-gray-900">{selectedImage.name}</p>
                        <p className="text-sm text-gray-500">
                          {(selectedImage.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>

                      {/* Process Button */}
                      <div className="flex justify-center">
                        <Button 
                          onClick={handleImageSubmit}
                          disabled={isLoading}
                          size="lg"
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-3"
                        >
                          {isLoading ? (
                            <>
                              <Clock className="mr-2 h-5 w-5 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <FileImage className="mr-2 h-5 w-5" />
                              Extract Data
                            </>
                          )}
                        </Button>
                      </div>

                      {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-800 text-sm">{error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : (
          /* Form Stage */
          <div className="flex-1 flex">
            {/* Left Side - Image Preview with Zoom */}
            <div className="w-1/3 flex-shrink-0 bg-white/50 backdrop-blur-sm border-r border-gray-200">
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0 p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileImage className="h-5 w-5 text-blue-600" />
                    Source Image
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Hover over image to zoom</p>
                </div>
                
                <div className="flex-1 p-4 flex flex-col">
                  {imagePreview && (
                    <>
                      <div 
                        className="flex-1 bg-gray-50 rounded-lg overflow-hidden mb-4 relative cursor-crosshair"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onMouseMove={handleMouseMove}
                      >
                        <img 
                          src={imagePreview} 
                          alt="Prescription" 
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                        
                        {/* Zoom Lens */}
                        {isZooming && (
                          <>
                            {/* Zoom lens overlay */}
                            <div 
                              className="absolute w-32 h-32 border-2 border-blue-500 bg-blue-100/20 pointer-events-none"
                              style={{
                                left: `${zoomPosition.x}px`,
                                top: `${zoomPosition.y}px`,
                                transform: 'translate(0, 0)',
                              }}
                            />
                            
                            {/* Zoomed image display */}
                            <div 
                              className="absolute top-4 right-4 w-80 h-80 border-2 border-gray-300 bg-white rounded-lg shadow-lg overflow-hidden pointer-events-none"
                              style={{
                                backgroundImage: `url(${imagePreview})`,
                                backgroundSize: '800% 800%',
                                backgroundPosition: `${zoomBackgroundPosition.x}% ${zoomBackgroundPosition.y}%`,
                                backgroundRepeat: 'no-repeat'
                              }}
                            >
                              <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-xs p-1 text-center">
                                4x Zoom
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p className="font-medium truncate">{selectedImage?.name}</p>
                        <p className="text-xs">
                          {selectedImage && (selectedImage.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 min-w-0">
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
    </div>
  )
}
