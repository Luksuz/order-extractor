"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

interface ImageExtractorFormProps {
  orderData?: any
  onSubmit: (data: any) => void
  isLoading?: boolean
  error?: string | null
}

export default function ImageExtractorForm({ 
  orderData, 
  onSubmit, 
  isLoading = false, 
  error 
}: ImageExtractorFormProps) {
  const [formData, setFormData] = useState<any>({
    // Provide default values for required fields
    JOB: `ORD${Date.now().toString().slice(-6)}`,
    CLIENT: 'Customer Name',
    DO: 'B',
    // Default credentials
    rxoffice_username: '380',
    rxoffice_password: 'ZOHO123'
  })

  useEffect(() => {
    if (orderData) {
      setFormData((prevData: any) => ({
        ...prevData, // Keep defaults
        ...orderData // Override with extracted data
      }))
    }
  }, [orderData])

  const handleInputChange = async (field: string, value: string) => {
    // Handle customer name matching
    if (field === 'CLIENT') {
      try {
        const response = await fetch('/api/match-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: value })
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.matched && result.code) {
            // Replace the name with customer code
            setFormData((prev: any) => ({
              ...prev,
              [field]: result.code,
              originalCustomerName: value,
              customerMatchInfo: {
                exactMatch: result.exactMatch,
                customerName: result.customer.name,
                customerCity: result.customer.city,
                alternativeMatches: result.alternativeMatches || []
              }
            }))
            return
          }
        }
      } catch (error) {
        console.error('Error matching customer:', error)
      }
    }

    // Handle lens code matching (LNAM field)
    if (field === 'LNAM') {
      try {
        const response = await fetch('/api/match-lens-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: value })
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.matched && result.code) {
            // Replace the lens code with matched code
            setFormData((prev: any) => ({
              ...prev,
              [field]: result.code,
              originalLensCode: value,
              lensCodeMatchInfo: {
                exactMatch: result.exactMatch,
                lensCode: result.lensCode,
                alternativeMatches: result.alternativeMatches || []
              }
            }))
            return
          }
        }
      } catch (error) {
        console.error('Error matching lens code:', error)
      }
    }

    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
      // Clear match info if user is editing the fields manually
      ...(field === 'CLIENT' ? { customerMatchInfo: null, originalCustomerName: null } : {}),
      ...(field === 'LNAM' ? { lensCodeMatchInfo: null, originalLensCode: null } : {})
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('📤 Form submitting with data:', formData)
    onSubmit(formData)
  }

  const generateOrderId = () => {
    const id = `ORD${Date.now().toString().slice(-6)}`
    handleInputChange('JOB', id)
  }

  if (!orderData && !Object.keys(formData).length) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Extracted Order Data</CardTitle>
          <CardDescription>
            Upload and process an image to see extracted prescription data here
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No data extracted yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Extracted Order Data</CardTitle>
        <CardDescription>
          Review and edit the extracted prescription data before submitting
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <ScrollArea className="h-full">
            <div className="space-y-6">
              {/* RxOffice Credentials - Moved to top */}
              <div>
                <h3 className="text-lg font-semibold mb-3">RxOffice EDI Credentials</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rxoffice_username">Username</Label>
                    <Input
                      id="rxoffice_username"
                      value={formData.rxoffice_username || ""}
                      onChange={(e) => handleInputChange('rxoffice_username', e.target.value)}
                      placeholder="RxOffice username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rxoffice_password">Password</Label>
                    <Input
                      id="rxoffice_password"
                      type="password"
                      value={formData.rxoffice_password || ""}
                      onChange={(e) => handleInputChange('rxoffice_password', e.target.value)}
                      placeholder="RxOffice password"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Basic Order Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Basic Order Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="DO">Eyes</Label>
                    <Input
                      id="DO"
                      value={formData.DO || "B"}
                      onChange={(e) => handleInputChange('DO', e.target.value)}
                      placeholder="B, R, or L"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="JOB">Order ID</Label>
                      <Input
                        id="JOB"
                        value={formData.JOB || ""}
                        onChange={(e) => handleInputChange('JOB', e.target.value)}
                        placeholder="Customer ERP Order Number"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={generateOrderId}
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="CLIENT">Wearer's Name</Label>
                    <Input
                      id="CLIENT"
                      value={formData.CLIENT || ""}
                      onChange={(e) => handleInputChange('CLIENT', e.target.value)}
                      placeholder="Full name"
                    />
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Auto-matched only if exactly matches database name (e.g., "EYELOOK EYEWEAR OPTIC SDN BHD")
                    </p>
                    {formData.originalCustomerName && (
                      <div className="mt-1 space-y-1">
                        <p className="text-xs text-gray-500">
                          Original: {formData.originalCustomerName}
                        </p>
                        {formData.customerMatchInfo && (
                          <div className="text-xs">
                            {formData.customerMatchInfo.exactMatch ? (
                              <p className="text-green-600">
                                ✓ Exact match: {formData.customerMatchInfo.customerName}
                                {formData.customerMatchInfo.customerCity && ` (${formData.customerMatchInfo.customerCity})`}
                              </p>
                            ) : (
                              <div>
                                <p className="text-yellow-600">
                                  ⚠ Partial match: {formData.customerMatchInfo.customerName}
                                  {formData.customerMatchInfo.customerCity && ` (${formData.customerMatchInfo.customerCity})`}
                                </p>
                                {formData.customerMatchInfo.alternativeMatches && 
                                 formData.customerMatchInfo.alternativeMatches.length > 0 && (
                                  <div className="mt-1">
                                    <p className="text-gray-500">Other matches:</p>
                                    {formData.customerMatchInfo.alternativeMatches.slice(0, 3).map((match: any, idx: number) => (
                                      <p key={idx} className="text-gray-400 ml-2">
                                        • {match.name} ({match.city || 'No city'})
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="CLIENTF">Name Abbreviation</Label>
                    <Input
                      id="CLIENTF"
                      value={formData.CLIENTF || ""}
                      onChange={(e) => handleInputChange('CLIENTF', e.target.value)}
                      placeholder="Initials"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="SHOPNUMBER">Shop Number</Label>
                    <Input
                      id="SHOPNUMBER"
                      value={formData.SHOPNUMBER || ""}
                      onChange={(e) => handleInputChange('SHOPNUMBER', e.target.value)}
                      placeholder="Intermediary ERP Order Number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ShopNumber">ERP Query Number</Label>
                    <Input
                      id="ShopNumber"
                      value={formData.ShopNumber || ""}
                      onChange={(e) => handleInputChange('ShopNumber', e.target.value)}
                      placeholder="ERP Query Number"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Prescription Data */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Prescription Data</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="SPH">Sphere (R;L)</Label>
                    <Input
                      id="SPH"
                      value={formData.SPH || ""}
                      onChange={(e) => handleInputChange('SPH', e.target.value)}
                      placeholder="e.g., -1.75;-1.75"
                    />
                  </div>
                  <div>
                    <Label htmlFor="CYL">Cylinder (R;L)</Label>
                    <Input
                      id="CYL"
                      value={formData.CYL || ""}
                      onChange={(e) => handleInputChange('CYL', e.target.value)}
                      placeholder="e.g., -0.5;-0.25"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="AX">Axis (R;L)</Label>
                    <Input
                      id="AX"
                      value={formData.AX || ""}
                      onChange={(e) => handleInputChange('AX', e.target.value)}
                      placeholder="e.g., 45;180"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ADD">Add Power (R;L)</Label>
                    <Input
                      id="ADD"
                      value={formData.ADD || ""}
                      onChange={(e) => handleInputChange('ADD', e.target.value)}
                      placeholder="e.g., 1.75;1.75"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="PRVM">Prescription Prism (R;L)</Label>
                    <Input
                      id="PRVM"
                      value={formData.PRVM || ""}
                      onChange={(e) => handleInputChange('PRVM', e.target.value)}
                      placeholder="e.g., 0;0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="PRVA">Prism Base Direction (R;L)</Label>
                    <Input
                      id="PRVA"
                      value={formData.PRVA || ""}
                      onChange={(e) => handleInputChange('PRVA', e.target.value)}
                      placeholder="e.g., 0;0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="PRVIN">Horizontal Prism Direction (R;L)</Label>
                    <Input
                      id="PRVIN"
                      value={formData.PRVIN || ""}
                      onChange={(e) => handleInputChange('PRVIN', e.target.value)}
                      placeholder="e.g., 3;2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="PRVUP">Vertical Prism Direction (R;L)</Label>
                    <Input
                      id="PRVUP"
                      value={formData.PRVUP || ""}
                      onChange={(e) => handleInputChange('PRVUP', e.target.value)}
                      placeholder="e.g., 1.5;1"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Frame & Measurements */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Frame & Measurements</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="IPD">IPD Far (R;L)</Label>
                    <Input
                      id="IPD"
                      value={formData.IPD || ""}
                      onChange={(e) => handleInputChange('IPD', e.target.value)}
                      placeholder="e.g., 30.5;30.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="NPD">Near PD (R;L)</Label>
                    <Input
                      id="NPD"
                      value={formData.NPD || ""}
                      onChange={(e) => handleInputChange('NPD', e.target.value)}
                      placeholder="e.g., 28.57;28.57"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="HBOX">Frame Width (R;L)</Label>
                    <Input
                      id="HBOX"
                      value={formData.HBOX || ""}
                      onChange={(e) => handleInputChange('HBOX', e.target.value)}
                      placeholder="e.g., 44.95;44.97"
                    />
                  </div>
                  <div>
                    <Label htmlFor="VBOX">Frame Height (R;L)</Label>
                    <Input
                      id="VBOX"
                      value={formData.VBOX || ""}
                      onChange={(e) => handleInputChange('VBOX', e.target.value)}
                      placeholder="e.g., 39.96;40.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="DBL">Bridge Width</Label>
                    <Input
                      id="DBL"
                      value={formData.DBL || ""}
                      onChange={(e) => handleInputChange('DBL', e.target.value)}
                      placeholder="e.g., 20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="FED">Frame Effective Diameter (R;L)</Label>
                    <Input
                      id="FED"
                      value={formData.FED || ""}
                      onChange={(e) => handleInputChange('FED', e.target.value)}
                      placeholder="e.g., 49.84;49.92"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="SEGHT">Segment Height (R;L)</Label>
                    <Input
                      id="SEGHT"
                      value={formData.SEGHT || ""}
                      onChange={(e) => handleInputChange('SEGHT', e.target.value)}
                      placeholder="e.g., 28.04;28.02"
                    />
                  </div>
                  <div>
                    <Label htmlFor="BVD">Back Vertex Distance (R;L)</Label>
                    <Input
                      id="BVD"
                      value={formData.BVD || ""}
                      onChange={(e) => handleInputChange('BVD', e.target.value)}
                      placeholder="e.g., 13;13"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Lens & Coating Options */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Lens & Coating Options</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="LNAM">Lens Code (R;L)</Label>
                    <Input
                      id="LNAM"
                      value={formData.LNAM || ""}
                      onChange={(e) => handleInputChange('LNAM', e.target.value)}
                      placeholder="e.g., OVMDXV;OVMDXV"
                    />
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Auto-matched only if exactly matches database name (e.g., "RX SV 170-Hi Index Glass")
                    </p>
                    {formData.originalLensCode && (
                      <div className="mt-1 space-y-1">
                        <p className="text-xs text-gray-500">
                          Original: {formData.originalLensCode}
                        </p>
                        {formData.lensCodeMatchInfo && (
                          <div className="text-xs">
                            {formData.lensCodeMatchInfo.exactMatch ? (
                              <p className="text-green-600">
                                ✓ Exact match: {formData.lensCodeMatchInfo.lensCode.retail_name || formData.lensCodeMatchInfo.lensCode.retail_code}
                                <span className="text-gray-500 ml-1">({formData.lensCodeMatchInfo.lensCode.source})</span>
                              </p>
                            ) : (
                              <div>
                                <p className="text-yellow-600">
                                  ⚠ Partial match: {formData.lensCodeMatchInfo.lensCode.retail_name || formData.lensCodeMatchInfo.lensCode.retail_code}
                                  <span className="text-gray-500 ml-1">({formData.lensCodeMatchInfo.lensCode.source})</span>
                                </p>
                                {formData.lensCodeMatchInfo.alternativeMatches && 
                                 formData.lensCodeMatchInfo.alternativeMatches.length > 0 && (
                                  <div className="mt-1">
                                    <p className="text-gray-500">Other matches:</p>
                                    {formData.lensCodeMatchInfo.alternativeMatches.slice(0, 3).map((match: any, idx: number) => (
                                      <p key={idx} className="text-gray-400 ml-2">
                                        • {match.retail_name || match.retail_code} ({match.source})
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="CustomerRetailName">Product Name (R;L)</Label>
                    <Input
                      id="CustomerRetailName"
                      value={formData.CustomerRetailName || ""}
                      onChange={(e) => handleInputChange('CustomerRetailName', e.target.value)}
                      placeholder="Terminal Sales Product Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="TINT">Tint Code</Label>
                    <Input
                      id="TINT"
                      value={formData.TINT || ""}
                      onChange={(e) => handleInputChange('TINT', e.target.value)}
                      placeholder="Tint code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ACOAT">Coating Code (R;L)</Label>
                    <Input
                      id="ACOAT"
                      value={formData.ACOAT || ""}
                      onChange={(e) => handleInputChange('ACOAT', e.target.value)}
                      placeholder="e.g., PT GREEN;PT GREEN"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="COLR">Color Code (R;L)</Label>
                    <Input
                      id="COLR"
                      value={formData.COLR || ""}
                      onChange={(e) => handleInputChange('COLR', e.target.value)}
                      placeholder="e.g., Gray;Gray"
                    />
                  </div>
                  <div>
                    <Label htmlFor="PANTO">Pantoscopic Tilt (R;L)</Label>
                    <Input
                      id="PANTO"
                      value={formData.PANTO || ""}
                      onChange={(e) => handleInputChange('PANTO', e.target.value)}
                      placeholder="Pantoscopic tilt"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Advanced Technical Parameters */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Advanced Technical Parameters</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="CRIB">Diameter 1 (R;L)</Label>
                    <Input
                      id="CRIB"
                      value={formData.CRIB || ""}
                      onChange={(e) => handleInputChange('CRIB', e.target.value)}
                      placeholder="e.g., 70;70"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ELLH">Diameter 2 (R;L)</Label>
                    <Input
                      id="ELLH"
                      value={formData.ELLH || ""}
                      onChange={(e) => handleInputChange('ELLH', e.target.value)}
                      placeholder="e.g., 70;70"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="MINTHKCD">Min Edge/Center Thickness (R;L)</Label>
                    <Input
                      id="MINTHKCD"
                      value={formData.MINTHKCD || ""}
                      onChange={(e) => handleInputChange('MINTHKCD', e.target.value)}
                      placeholder="e.g., 0.51;0.51"
                    />
                  </div>
                  <div>
                    <Label htmlFor="MINCTR">Min Center Thickness (R;L)</Label>
                    <Input
                      id="MINCTR"
                      value={formData.MINCTR || ""}
                      onChange={(e) => handleInputChange('MINCTR', e.target.value)}
                      placeholder="e.g., 1.64;1.64"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="BCERIN">Horizontal Decentration (R;L)</Label>
                    <Input
                      id="BCERIN"
                      value={formData.BCERIN || ""}
                      onChange={(e) => handleInputChange('BCERIN', e.target.value)}
                      placeholder="e.g., 0;0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="BCERUP">Vertical Decentration (R;L)</Label>
                    <Input
                      id="BCERUP"
                      value={formData.BCERUP || ""}
                      onChange={(e) => handleInputChange('BCERUP', e.target.value)}
                      placeholder="e.g., 0;0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="ZTILT">Face Form Tilt (R;L)</Label>
                    <Input
                      id="ZTILT"
                      value={formData.ZTILT || ""}
                      onChange={(e) => handleInputChange('ZTILT', e.target.value)}
                      placeholder="Lens surface curve"
                    />
                  </div>
                  <div>
                    <Label htmlFor="MBASE">Marked Base Curve (R;L)</Label>
                    <Input
                      id="MBASE"
                      value={formData.MBASE || ""}
                      onChange={(e) => handleInputChange('MBASE', e.target.value)}
                      placeholder="Base curve"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {error && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Submitting..." : "Submit Order"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 