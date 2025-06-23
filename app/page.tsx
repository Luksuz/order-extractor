"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, FileImage, CheckCircle, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import ImageExtractorForm from "@/components/image-extractor-form"
import { toast } from "sonner"
import Image from "next/image"
import ImageCarousel from "@/components/image-carousel"

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractedOrder, setExtractedOrder] = useState<any | null>(null)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Only set dragging to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleImageSelect(files)
    }
  }

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return
    
    const newFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    )
    
    if (newFiles.length !== files.length) {
      toast.error("Invalid Files", {
        description: "Only image files (JPG, PNG, WEBP) and PDF files are supported.",
        duration: 4000
      })
    }
    
    const allFiles = [...selectedImages, ...newFiles]
    
    // Limit to 5 images maximum
    if (allFiles.length > 5) {
      toast.error("Too Many Images", {
        description: "Maximum 5 images allowed. Please remove some images first.",
        duration: 4000
      })
      return
    }
    
    setSelectedImages(allFiles)
    
    // Create previews for new files
    const newPreviews: string[] = []
    let processedCount = 0
    
    newFiles.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews[index] = e.target?.result as string
        processedCount++
        
        if (processedCount === newFiles.length) {
          setImagePreviews(prev => [...prev, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleImageSubmit = async () => {
    if (selectedImages.length === 0) return

    setIsLoading(true)
    setError(null)

    console.log("=== Processing Images ===")
    console.log("Files:", selectedImages.map(f => f.name))

    try {
      // Create form data for the extract-order API
      const formData = new FormData()
      selectedImages.forEach((image, index) => {
        formData.append(`images`, image)
      })

      // Send to extract-order API
      const response = await fetch("/api/extract-order", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        throw new Error("Failed to process images")
      }

      const result = await response.json()
      console.log("Extraction result:", result)
      
      if (result.success && result.data) {
        console.log("Setting extracted order data:", result.data)
        setExtractedOrder(result.data)
        
        toast.success("Images Processed Successfully!", {
          description: `Prescription data extracted from ${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''}`,
          duration: 4000
        })
      } else {
        console.warn("No data found in result")
        const errorMessage = result.error || "Could not extract order data from images"
        setError(errorMessage)
        toast.error("Image Processing Failed", {
          description: errorMessage,
          duration: 5000
        })
      }

    } catch (err) {
      console.error("Error processing images:", err)
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

    console.log("=== Submitting Order to RxOffice EDI ===")
    console.log("Order data:", orderData)

    // Extract credentials from form data
    const credentials = {
      userName: orderData.rxoffice_username || "380",
      password: orderData.rxoffice_password || "ZOHO123"
    }
    
    // Remove credentials from order data before sending to VCA converter
    const { rxoffice_username, rxoffice_password, ...cleanOrderData } = orderData

    console.log("Using credentials:", { 
      userName: credentials.userName, 
      password: '*'.repeat(credentials.password.length) 
    })

    try {
      // Send to SOAP API
      const response = await fetch("/api/create-order-soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderData: cleanOrderData,
          credentials: credentials
        })
      })

      const result = await response.json()
      console.log("SOAP submission result:", result)

      if (result.success) {
        console.log("Order created successfully:", result.data)
        
        // Extract order ID properly
        const orderId = typeof result.data === 'object' 
          ? (result.data.Id || result.data.Reference || result.data) 
          : result.data
        
        // Show success message with order details
        const customerName = cleanOrderData.CLIENT || cleanOrderData.client || "Unknown"
        const orderType = cleanOrderData.SPH ? "Prescription" : "Frame"
        
        toast.success("Order Created Successfully!", {
          description: `${orderType} order for ${customerName} • ID: ${orderId}`,
          duration: 6000
        })
        
        // Log detailed information for debugging
        console.log("📋 Order Details:", {
          orderNumber: orderId,
          customer: customerName,
          type: orderType,
          vca: result.vca
        })
        
        // Clear form after successful submission
        setExtractedOrder(null)
        setSelectedImages([])
        setImagePreviews([])

      } else {
        // Create error object with validation errors if they exist
        const error: any = new Error(result.message || result.error || "Failed to create order")
        if (result.validationErrors) {
          error.validationErrors = result.validationErrors
        }
        throw error
      }

    } catch (err: any) {
      console.error("Error submitting order:", err)
      
      // Check if this is a validation error with specific validation messages
      if (err.validationErrors && Array.isArray(err.validationErrors)) {
        const validationErrors = err.validationErrors
        setError(validationErrors.join(', '))
        
        // Show a separate toast for each validation error
        validationErrors.forEach((errorMessage: string, index: number) => {
          setTimeout(() => {
            toast.error("Validation Error", {
              description: errorMessage,
              duration: 6000
            })
          }, index * 500) // Stagger the toasts by 500ms each
        })
      } else {
        const errorMessage = err instanceof Error ? err.message : "Failed to submit order to RxOffice EDI"
        setError(errorMessage)
        
        toast.error("Order Submission Failed", {
          description: errorMessage,
          duration: 5000
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const clearAll = () => {
    setExtractedOrder(null)
    setSelectedImages([])
    setImagePreviews([])
    setError(null)
  }

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    
    setSelectedImages(newImages)
    setImagePreviews(newPreviews)
    
    if (newImages.length === 0) {
      setExtractedOrder(null)
    }
  }

  const removeAllImages = () => {
    setSelectedImages([])
    setImagePreviews([])
    setExtractedOrder(null)
  }

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-0 sticky top-0 z-50 h-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-full">
          <div className="flex items-center h-full">
            <div className="relative h-full flex items-center">
              <Image
                src="/public.png"
                alt="EyeLens Advance AI"
                width={400}
                height={60}
                className="h-full w-auto object-contain"
                priority
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={clearAll} 
              disabled={isLoading}
              className="hover:bg-gray-50"
            >
              Clear All
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6">
        <div className="flex flex-col gap-6">
          {/* Welcome Section */}
          {!selectedImages.length && !extractedOrder && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                <FileImage className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                Transform Prescriptions with AI
              </h1>

            </div>
          )}

          {/* Enhanced Upload Section */}
          <Card className="overflow-hidden border-0 shadow-lg bg-white/50 backdrop-blur-sm">
            <div className="p-4">
              {!selectedImages.length ? (
                <div 
                  className={`text-center py-6 border-2 border-dashed rounded-lg transition-colors ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-50/50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-3">
                    <Upload className="h-6 w-6 text-blue-600" />
                  </div>
                  
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const files = e.target.files
                      if (files) handleImageSelect(files)
                    }}
                    className="hidden"
                    id="file-upload"
                    multiple
                  />
                  <Button 
                    size="default"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Select Prescription Images
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Image Count and Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-medium text-gray-900">
                        {selectedImages.length} Image{selectedImages.length > 1 ? 's' : ''} Selected
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const files = e.target.files
                          if (files) handleImageSelect(files)
                        }}
                        className="hidden"
                        id="add-more-files"
                        multiple
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('add-more-files')?.click()}
                        disabled={isLoading || selectedImages.length >= 5}
                        className="text-xs px-2 py-1 h-7"
                      >
                        Add More
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeAllImages}
                        disabled={isLoading}
                        className="text-gray-500 hover:text-red-600 hover:bg-red-50 text-xs px-2 py-1 h-7"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remove All
                      </Button>
                    </div>
                  </div>

                  {/* Compact Image Strip */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {selectedImages.map((image, index) => (
                      <div key={`${image.name}-${index}`} className="relative group flex-shrink-0">
                        <div className="w-12 h-12 rounded-md border border-gray-200 overflow-hidden bg-gray-50">
                          {imagePreviews[index] && (
                            <img 
                              src={imagePreviews[index]} 
                              alt={`Prescription ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        
                        {/* Remove button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeImage(index)}
                          disabled={isLoading}
                          className="absolute -top-1 -right-1 w-4 h-4 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-2 w-2" />
                        </Button>
                        
                        {/* Success indicator */}
                        {extractedOrder && (
                          <div className="absolute -top-1 -left-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* File info summary */}
                    <div className="flex-shrink-0 text-xs text-gray-500 ml-2">
                      {selectedImages.reduce((total, file) => total + file.size, 0) > 0 && (
                        <span>
                          {(selectedImages.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(1)} MB total
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Process Button */}
                  <div className="flex justify-center pt-2">
                    {!extractedOrder && (
                      <Button 
                        onClick={handleImageSubmit}
                        disabled={isLoading}
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2"
                      >
                        {isLoading ? (
                          <>
                            <Clock className="mr-2 h-3 w-3 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <FileImage className="mr-2 h-3 w-3" />
                            Extract Data
                          </>
                        )}
                      </Button>
                    )}
                    
                    {extractedOrder && (
                      <div className="text-center">
                        <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md border border-green-200">
                          <CheckCircle className="h-3 w-3" />
                          <span className="font-medium text-xs">
                            Data extracted
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Main Content Area - Reorganized Layout */}
          {extractedOrder ? (
            <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh]">
              {/* Left Half - Image Carousel */}
              {imagePreviews.length > 0 && (
                <div className="lg:w-1/2 w-full flex-shrink-0">
                  <div className="lg:sticky lg:top-6">
                    <Card className="overflow-hidden border-0 shadow-lg bg-white/50 backdrop-blur-sm h-full">
                      <div className="p-4 h-full flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                          <FileImage className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            Images ({imagePreviews.length})
                          </h3>
                        </div>
                        
                        {/* Image Carousel */}
                        <div className="flex-1">
                          <ImageCarousel 
                            images={imagePreviews} 
                            selectedImages={selectedImages}
                            onRemoveImage={removeImage}
                            isLoading={isLoading}
                            fullSize={true}
                          />
                        </div>
                        
                        {/* Image Actions */}
                        <div className="flex gap-2 mt-4">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const files = e.target.files
                              if (files) handleImageSelect(files)
                            }}
                            className="hidden"
                            id="add-more-images"
                            multiple
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('add-more-images')?.click()}
                            disabled={isLoading || selectedImages.length >= 5}
                            className="flex-1"
                          >
                            Add More
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={removeAllImages}
                            disabled={isLoading}
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* Right Half - Form */}
              <div className="lg:w-1/2 w-full min-w-0">
                <ImageExtractorForm
                  orderData={extractedOrder}
                  onSubmit={handleFormSubmit}
                  isLoading={isLoading}
                  error={error}
                />
              </div>
            </div>
          ) : (
            /* Show half-screen layout when no extracted order */
            imagePreviews.length > 0 && (
              <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh]">
                {/* Left Half - Image Preview */}
                <div className="lg:w-1/2 w-full">
                  <Card className="h-full overflow-hidden border-0 shadow-lg bg-white/50 backdrop-blur-sm">
                    <div className="p-6 h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-4">
                        <FileImage className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          Image Preview ({imagePreviews.length})
                        </h3>
                      </div>
                      
                      <div className="flex-1 min-h-0">
                        <ImageCarousel 
                          images={imagePreviews} 
                          selectedImages={selectedImages}
                          onRemoveImage={removeImage}
                          isLoading={isLoading}
                          fullSize={true}
                        />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Half - Form */}
                <div className="lg:w-1/2 w-full">
                  <ImageExtractorForm
                    orderData={extractedOrder}
                    onSubmit={handleFormSubmit}
                    isLoading={isLoading}
                    error={error}
                  />
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </main>
  )
}
