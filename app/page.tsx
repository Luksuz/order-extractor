"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, FileImage, CheckCircle, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import ImageExtractorForm from "@/components/image-extractor-form"
import { toast } from "sonner"
import Image from "next/image"

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractedOrder, setExtractedOrder] = useState<any | null>(null)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  
  const handleImageSelect = (files: FileList | null) => {
    if (!files) return
    
    const newFiles = Array.from(files)
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
                width={300}
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Transform Prescriptions with AI
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Upload prescription images and let our AI extract order data for seamless RxOffice EDI integration
              </p>
            </div>
          )}

          {/* Enhanced Upload Section */}
          <Card className="overflow-hidden border-0 shadow-lg bg-white/50 backdrop-blur-sm">
            <div className="p-6">
              {!selectedImages.length ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <Upload className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Upload Prescription Images
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Drag and drop your prescription images or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Supports JPG, PNG, and PDF files up to 20MB each
                  </p>
                  
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
                    size="lg"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 text-lg font-semibold"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Select Prescription Images
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Image Count and Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
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
                        <X className="h-4 w-4 mr-1" />
                        Remove All
                      </Button>
                    </div>
                  </div>

                  {/* Image Gallery */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {selectedImages.map((image, index) => (
                      <div key={`${image.name}-${index}`} className="relative group">
                        <div className="aspect-square rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
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
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        
                        {/* File info */}
                        <div className="mt-1">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {image.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(image.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                        
                        {/* Success indicator */}
                        {extractedOrder && (
                          <div className="absolute top-2 left-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Process Button */}
                  <div className="flex justify-center pt-4">
                    {!extractedOrder && (
                      <Button 
                        onClick={handleImageSubmit}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8"
                      >
                        {isLoading ? (
                          <>
                            <Clock className="mr-2 h-4 w-4 animate-spin" />
                            Processing {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''}...
                          </>
                        ) : (
                          <>
                            <FileImage className="mr-2 h-4 w-4" />
                            Extract Data from {selectedImages.length} Image{selectedImages.length > 1 ? 's' : ''}
                          </>
                        )}
                      </Button>
                    )}
                    
                    {extractedOrder && (
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">
                            Data extracted from {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Main Content Area - Full Width Layout */}
          {imagePreviews.length > 0 && (
            <div className="flex flex-col xl:flex-row gap-6 min-h-[80vh]">
              {/* Image Preview - Responsive Layout */}
              <div className="xl:w-3/5 w-full">
                <Card className="h-full overflow-hidden border-0 shadow-lg bg-white/50 backdrop-blur-sm">
                  <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <FileImage className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Image Preview ({imagePreviews.length})
                      </h3>
                    </div>
                    
                    <div className="flex-1 min-h-0">
                      {imagePreviews.length === 1 ? (
                        // Single image - use full space
                        <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
                          <img 
                            src={imagePreviews[0]} 
                            alt="Prescription" 
                            className="max-w-full max-h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(imagePreviews[0], '_blank')}
                          />
                        </div>
                      ) : imagePreviews.length === 2 ? (
                        // Two images - stack vertically
                        <div className="h-full flex flex-col gap-3">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="flex-1 bg-gray-50 rounded-lg overflow-hidden">
                              <img 
                                src={preview} 
                                alt={`Prescription ${index + 1}`} 
                                className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => window.open(preview, '_blank')}
                              />
                            </div>
                          ))}
                        </div>
                      ) : imagePreviews.length === 3 ? (
                        // Three images - one large on left, two stacked on right
                        <div className="h-full flex gap-3">
                          <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden">
                            <img 
                              src={imagePreviews[0]} 
                              alt="Prescription 1" 
                              className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => window.open(imagePreviews[0], '_blank')}
                            />
                          </div>
                          <div className="flex-1 flex flex-col gap-3">
                            {imagePreviews.slice(1).map((preview, index) => (
                              <div key={index + 1} className="flex-1 bg-gray-50 rounded-lg overflow-hidden">
                                <img 
                                  src={preview} 
                                  alt={`Prescription ${index + 2}`} 
                                  className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => window.open(preview, '_blank')}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        // Four or more images - 2x2 grid or responsive grid
                        <div className="h-full grid grid-cols-2 gap-3 overflow-y-auto">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
                              <img 
                                src={preview} 
                                alt={`Prescription ${index + 1}`} 
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => window.open(preview, '_blank')}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Extracted Form - Takes remaining space */}
              <div className="xl:w-2/5 w-full">
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
    </main>
  )
}
