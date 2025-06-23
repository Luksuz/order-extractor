"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X, Eye, Download } from "lucide-react"
import ImageModal from "./image-modal"

interface ImageCarouselProps {
  images: string[]
  selectedImages: File[]
  onRemoveImage: (index: number) => void
  isLoading: boolean
  fullSize?: boolean
}

export default function ImageCarousel({
  images,
  selectedImages,
  onRemoveImage,
  isLoading,
  fullSize = false
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Reset index if it's out of bounds when images change
  useEffect(() => {
    if (currentIndex >= images.length && images.length > 0) {
      setCurrentIndex(images.length - 1)
    } else if (images.length === 0) {
      setCurrentIndex(0)
    }
  }, [images.length, currentIndex])

  if (images.length === 0) return null

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToImage = (index: number) => {
    setCurrentIndex(index)
  }

  const openModal = () => {
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleModalNavigate = (index: number) => {
    setCurrentIndex(index)
  }

  const downloadImage = () => {
    const link = document.createElement('a')
    link.href = images[currentIndex]
    link.download = selectedImages[currentIndex]?.name || `prescription-${currentIndex + 1}`
    link.click()
  }

  return (
    <>
      <div className="space-y-3">
        {/* Main Image Display */}
        <div className={`relative bg-gray-50 rounded-lg overflow-hidden cursor-pointer ${
          fullSize ? 'h-96 min-h-96' : 'h-64 min-h-64'
        }`}>
          <img
            src={images[currentIndex]}
            alt={`Prescription ${currentIndex + 1}`}
            className="w-full h-full object-contain hover:scale-105 transition-transform"
            onClick={openModal}
          />
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  prevImage()
                }}
                disabled={isLoading}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  nextImage()
                }}
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Action Buttons */}
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                openModal()
              }}
              disabled={isLoading}
              className="bg-black/20 hover:bg-black/40 text-white h-8 w-8 p-0"
              title="View enlarged"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                downloadImage()
              }}
              disabled={isLoading}
              className="bg-black/20 hover:bg-black/40 text-white h-8 w-8 p-0"
              title="Download image"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveImage(currentIndex)
              }}
              disabled={isLoading}
              className="bg-red-500/80 hover:bg-red-600/90 text-white h-8 w-8 p-0"
              title="Remove image"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Thumbnail Navigation */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                disabled={isLoading}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* File Info */}
        {selectedImages[currentIndex] && (
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium truncate">{selectedImages[currentIndex].name}</p>
            <p className="text-xs">
              {(selectedImages[currentIndex].size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
        )}
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={closeModal}
        images={images}
        currentIndex={currentIndex}
        onNavigate={handleModalNavigate}
        selectedImages={selectedImages}
      />
    </>
  )
} 