"use client"

import React, { useState, useEffect, useCallback } from "react"
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
    CLIENT: 'Wearer Name', // This will be used for display, but SHOPNUMBER will be sent as CLIENT in SOAP
    SHOPNUMBER: 'Customer/Shop Name', // This will become the CLIENT field in SOAP submission
    DO: 'B',
    // Default credentials
    rxoffice_username: '380',
    rxoffice_password: 'ZOHO123'
  })

  // Debounce timers
  const [customerSearchTimer, setCustomerSearchTimer] = useState<NodeJS.Timeout | null>(null)
  const [lensCodeSearchTimer, setLensCodeSearchTimer] = useState<NodeJS.Timeout | null>(null)

  // Helper function to parse VCA format (R;L) into separate values
  const parseVCAValue = (vcaValue: string | undefined) => {
    if (!vcaValue) return { right: '', left: '' }
    const parts = vcaValue.split(';')
    return {
      right: parts[0] || '',
      left: parts[1] || ''
    }
  }

  // Helper function to combine separate values into VCA format (R;L)
  const combineToVCA = (right: string, left: string) => {
    if (!right && !left) return ''
    return `${right || ''};${left || ''}`
  }

  // Debounced customer search function
  const debouncedCustomerSearch = useCallback(async (value: string) => {
    if (!value || value.trim().length < 2) return

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
            SHOPNUMBER: result.code,
            originalCustomerName: value,
            customerMatchInfo: {
              exactMatch: result.exactMatch,
              customerName: result.customer.name,
              customerCity: result.customer.city,
              alternativeMatches: result.alternativeMatches || []
            }
          }))
        }
      }
    } catch (error) {
      console.error('Error matching customer:', error)
    }
  }, [])

  // Debounced lens code search function (updated for single field)
  const debouncedLensCodeSearch = useCallback(async (value: string) => {
    if (!value || value.trim().length < 2) return

    try {
      const response = await fetch('/api/match-lens-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.matched && result.code) {
          setFormData((prev: any) => ({
            ...prev,
            LNAM: result.code,
            originalLensCode: value,
            lensCodeMatchInfo: {
              exactMatch: result.exactMatch,
              lensCode: result.lensCode,
              alternativeMatches: result.alternativeMatches || []
            }
          }))
        }
      }
    } catch (error) {
      console.error('Error matching lens code:', error)
    }
  }, [])

  useEffect(() => {
    if (orderData) {
      setFormData((prevData: any) => ({
        ...prevData, // Keep defaults
        ...orderData // Override with extracted data
      }))
    }
  }, [orderData])

  const handleInputChange = async (field: string, value: string) => {
    // Handle customer name matching for SHOPNUMBER field with debounce
    if (field === 'SHOPNUMBER') {
      // Clear existing timer
      if (customerSearchTimer) {
        clearTimeout(customerSearchTimer)
      }

      // Update form data immediately
      setFormData((prev: any) => ({
        ...prev,
        [field]: value,
        customerMatchInfo: null,
        originalCustomerName: null
      }))

      // Set new timer for database search
      const newTimer = setTimeout(() => {
        debouncedCustomerSearch(value)
      }, 1000)
      
      setCustomerSearchTimer(newTimer)
      return
    }

    // Handle lens code matching (LNAM field) with debounce
    if (field === 'LNAM') {
      // Clear existing timer
      if (lensCodeSearchTimer) {
        clearTimeout(lensCodeSearchTimer)
      }

      // Update form data immediately
      setFormData((prev: any) => ({
        ...prev,
        [field]: value,
        lensCodeMatchInfo: null,
        originalLensCode: null
      }))

      // Set new timer for database search
      const newTimer = setTimeout(() => {
        debouncedLensCodeSearch(value)
      }, 1000)
      
      setLensCodeSearchTimer(newTimer)
      return
    }

    // Regular field updates (non-searchable fields)
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle separate eye field changes (only for prescription fields)
  const handleEyeFieldChange = (baseField: string, eye: 'right' | 'left', value: string) => {
    const currentVCA = parseVCAValue(formData[baseField])
    const newVCA = eye === 'right' 
      ? combineToVCA(value, currentVCA.left)
      : combineToVCA(currentVCA.right, value)
    
    setFormData((prev: any) => ({
      ...prev,
      [baseField]: newVCA
    }))
  }

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      if (customerSearchTimer) clearTimeout(customerSearchTimer)
      if (lensCodeSearchTimer) clearTimeout(lensCodeSearchTimer)
    }
  }, [customerSearchTimer, lensCodeSearchTimer])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prepare the data for submission
    // CLIENT field should contain the shop/customer information from SHOPNUMBER
    const submissionData = {
      ...formData,
      CLIENT: formData.SHOPNUMBER || formData.CLIENT, // Use SHOPNUMBER as CLIENT for SOAP order
      WEARER_NAME: formData.CLIENT // Keep the original wearer's name for reference
    }
    
    console.log('📤 Form submitting with data:', submissionData)
    onSubmit(submissionData)
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
                      onChange={(e) => handleEyeFieldChange('DO', e.target.value as 'right' | 'left', e.target.value)}
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
                    <Label htmlFor="SHOPNUMBER">Customer/Shop Name</Label>
                    <Input
                      id="SHOPNUMBER"
                      value={formData.SHOPNUMBER || ""}
                      onChange={(e) => handleInputChange('SHOPNUMBER', e.target.value)}
                      placeholder="Customer or Shop Name (used as CLIENT in order)"
                    />
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Auto-matched if at least partially matches database name (e.g., "EYELOOK EYEWEAR OPTIC SDN BHD")
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      ℹ️ This field will be used as CLIENT in the SOAP order
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
                
                {/* Sphere */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Sphere</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="SPH_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="SPH_L"
                        value={parseVCAValue(formData.SPH).left}
                        onChange={(e) => handleEyeFieldChange('SPH', 'left', e.target.value)}
                        placeholder="e.g., -1.75"
                      />
                    </div>
                    <div>
                      <Label htmlFor="SPH_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="SPH_R"
                        value={parseVCAValue(formData.SPH).right}
                        onChange={(e) => handleEyeFieldChange('SPH', 'right', e.target.value)}
                        placeholder="e.g., -1.75"
                      />
                    </div>
                  </div>
                </div>

                {/* Cylinder */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Cylinder</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="CYL_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="CYL_L"
                        value={parseVCAValue(formData.CYL).left}
                        onChange={(e) => handleEyeFieldChange('CYL', 'left', e.target.value)}
                        placeholder="e.g., -0.25"
                      />
                    </div>
                    <div>
                      <Label htmlFor="CYL_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="CYL_R"
                        value={parseVCAValue(formData.CYL).right}
                        onChange={(e) => handleEyeFieldChange('CYL', 'right', e.target.value)}
                        placeholder="e.g., -0.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Axis */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Axis</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="AX_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="AX_L"
                        value={parseVCAValue(formData.AX).left}
                        onChange={(e) => handleEyeFieldChange('AX', 'left', e.target.value)}
                        placeholder="e.g., 180"
                      />
                    </div>
                    <div>
                      <Label htmlFor="AX_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="AX_R"
                        value={parseVCAValue(formData.AX).right}
                        onChange={(e) => handleEyeFieldChange('AX', 'right', e.target.value)}
                        placeholder="e.g., 45"
                      />
                    </div>
                  </div>
                </div>

                {/* Add Power */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Add Power</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ADD_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="ADD_L"
                        value={parseVCAValue(formData.ADD).left}
                        onChange={(e) => handleEyeFieldChange('ADD', 'left', e.target.value)}
                        placeholder="e.g., 1.75"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ADD_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="ADD_R"
                        value={parseVCAValue(formData.ADD).right}
                        onChange={(e) => handleEyeFieldChange('ADD', 'right', e.target.value)}
                        placeholder="e.g., 1.75"
                      />
                    </div>
                  </div>
                </div>

                {/* Prescription Prism */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Prescription Prism</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="PRVM_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="PRVM_L"
                        value={parseVCAValue(formData.PRVM).left}
                        onChange={(e) => handleEyeFieldChange('PRVM', 'left', e.target.value)}
                        placeholder="e.g., 0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="PRVM_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="PRVM_R"
                        value={parseVCAValue(formData.PRVM).right}
                        onChange={(e) => handleEyeFieldChange('PRVM', 'right', e.target.value)}
                        placeholder="e.g., 0"
                      />
                    </div>
                  </div>
                </div>

                {/* Prism Base Direction */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Prism Base Direction</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="PRVA_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="PRVA_L"
                        value={parseVCAValue(formData.PRVA).left}
                        onChange={(e) => handleEyeFieldChange('PRVA', 'left', e.target.value)}
                        placeholder="e.g., 0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="PRVA_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="PRVA_R"
                        value={parseVCAValue(formData.PRVA).right}
                        onChange={(e) => handleEyeFieldChange('PRVA', 'right', e.target.value)}
                        placeholder="e.g., 0"
                      />
                    </div>
                  </div>
                </div>

                {/* Horizontal Prism Direction */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Horizontal Prism Direction</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="PRVIN_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="PRVIN_L"
                        value={parseVCAValue(formData.PRVIN).left}
                        onChange={(e) => handleEyeFieldChange('PRVIN', 'left', e.target.value)}
                        placeholder="e.g., 2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="PRVIN_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="PRVIN_R"
                        value={parseVCAValue(formData.PRVIN).right}
                        onChange={(e) => handleEyeFieldChange('PRVIN', 'right', e.target.value)}
                        placeholder="e.g., 3"
                      />
                    </div>
                  </div>
                </div>

                {/* Vertical Prism Direction */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Vertical Prism Direction</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="PRVUP_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="PRVUP_L"
                        value={parseVCAValue(formData.PRVUP).left}
                        onChange={(e) => handleEyeFieldChange('PRVUP', 'left', e.target.value)}
                        placeholder="e.g., 1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="PRVUP_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="PRVUP_R"
                        value={parseVCAValue(formData.PRVUP).right}
                        onChange={(e) => handleEyeFieldChange('PRVUP', 'right', e.target.value)}
                        placeholder="e.g., 1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Frame & Measurements */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Frame & Measurements</h3>
                
                {/* IPD Far */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">IPD Far</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="IPD_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="IPD_L"
                        value={parseVCAValue(formData.IPD).left}
                        onChange={(e) => handleEyeFieldChange('IPD', 'left', e.target.value)}
                        placeholder="e.g., 30.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="IPD_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="IPD_R"
                        value={parseVCAValue(formData.IPD).right}
                        onChange={(e) => handleEyeFieldChange('IPD', 'right', e.target.value)}
                        placeholder="e.g., 30.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Near PD */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Near PD</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="NPD_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="NPD_L"
                        value={parseVCAValue(formData.NPD).left}
                        onChange={(e) => handleEyeFieldChange('NPD', 'left', e.target.value)}
                        placeholder="e.g., 28.57"
                      />
                    </div>
                    <div>
                      <Label htmlFor="NPD_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="NPD_R"
                        value={parseVCAValue(formData.NPD).right}
                        onChange={(e) => handleEyeFieldChange('NPD', 'right', e.target.value)}
                        placeholder="e.g., 28.57"
                      />
                    </div>
                  </div>
                </div>

                {/* Frame Width */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Frame Width</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="HBOX_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="HBOX_L"
                        value={parseVCAValue(formData.HBOX).left}
                        onChange={(e) => handleEyeFieldChange('HBOX', 'left', e.target.value)}
                        placeholder="e.g., 44.97"
                      />
                    </div>
                    <div>
                      <Label htmlFor="HBOX_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="HBOX_R"
                        value={parseVCAValue(formData.HBOX).right}
                        onChange={(e) => handleEyeFieldChange('HBOX', 'right', e.target.value)}
                        placeholder="e.g., 44.95"
                      />
                    </div>
                  </div>
                </div>

                {/* Frame Height */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Frame Height</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="VBOX_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="VBOX_L"
                        value={parseVCAValue(formData.VBOX).left}
                        onChange={(e) => handleEyeFieldChange('VBOX', 'left', e.target.value)}
                        placeholder="e.g., 40.01"
                      />
                    </div>
                    <div>
                      <Label htmlFor="VBOX_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="VBOX_R"
                        value={parseVCAValue(formData.VBOX).right}
                        onChange={(e) => handleEyeFieldChange('VBOX', 'right', e.target.value)}
                        placeholder="e.g., 39.96"
                      />
                    </div>
                  </div>
                </div>

                {/* Bridge Width - Single field since it's the same for both eyes */}
                <div className="mb-4">
                  <Label htmlFor="DBL">Bridge Width</Label>
                  <Input
                    id="DBL"
                    value={formData.DBL || ""}
                    onChange={(e) => handleInputChange('DBL', e.target.value)}
                    placeholder="e.g., 20"
                  />
                </div>

                {/* Frame Effective Diameter */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Frame Effective Diameter</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="FED_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="FED_L"
                        value={parseVCAValue(formData.FED).left}
                        onChange={(e) => handleEyeFieldChange('FED', 'left', e.target.value)}
                        placeholder="e.g., 49.92"
                      />
                    </div>
                    <div>
                      <Label htmlFor="FED_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="FED_R"
                        value={parseVCAValue(formData.FED).right}
                        onChange={(e) => handleEyeFieldChange('FED', 'right', e.target.value)}
                        placeholder="e.g., 49.84"
                      />
                    </div>
                  </div>
                </div>

                {/* Segment Height */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Segment Height</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="SEGHT_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="SEGHT_L"
                        value={parseVCAValue(formData.SEGHT).left}
                        onChange={(e) => handleEyeFieldChange('SEGHT', 'left', e.target.value)}
                        placeholder="e.g., 28.02"
                      />
                    </div>
                    <div>
                      <Label htmlFor="SEGHT_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="SEGHT_R"
                        value={parseVCAValue(formData.SEGHT).right}
                        onChange={(e) => handleEyeFieldChange('SEGHT', 'right', e.target.value)}
                        placeholder="e.g., 28.04"
                      />
                    </div>
                  </div>
                </div>

                {/* Back Vertex Distance */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Back Vertex Distance</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="BVD_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="BVD_L"
                        value={parseVCAValue(formData.BVD).left}
                        onChange={(e) => handleEyeFieldChange('BVD', 'left', e.target.value)}
                        placeholder="e.g., 13"
                      />
                    </div>
                    <div>
                      <Label htmlFor="BVD_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="BVD_R"
                        value={parseVCAValue(formData.BVD).right}
                        onChange={(e) => handleEyeFieldChange('BVD', 'right', e.target.value)}
                        placeholder="e.g., 13"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Lens & Coating Options */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Lens & Coating Options</h3>
                
                {/* Lens Code - Single field */}
                <div className="mb-4">
                  <Label htmlFor="LNAM">Lens Code</Label>
                  <Input
                    id="LNAM"
                    value={formData.LNAM || ""}
                    onChange={(e) => handleInputChange('LNAM', e.target.value)}
                    placeholder="e.g., OVMDXV"
                  />
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                      Auto-matched if at least partially matches database name (e.g., "EYELOOK EYEWEAR OPTIC SDN BHD")
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

                {/* Product Name - Single field */}
                <div className="mb-4">
                  <Label htmlFor="CustomerRetailName">Product Name</Label>
                  <Input
                    id="CustomerRetailName"
                    value={formData.CustomerRetailName || ""}
                    onChange={(e) => handleInputChange('CustomerRetailName', e.target.value)}
                    placeholder="Terminal Sales Product Name"
                  />
                </div>

                {/* Tint Code - Single field */}
                <div className="mb-4">
                  <Label htmlFor="TINT">Tint Code</Label>
                  <Input
                    id="TINT"
                    value={formData.TINT || ""}
                    onChange={(e) => handleInputChange('TINT', e.target.value)}
                    placeholder="Tint code"
                  />
                </div>

                {/* Coating Code - Single field */}
                <div className="mb-4">
                  <Label htmlFor="ACOAT">Coating Code</Label>
                  <Input
                    id="ACOAT"
                    value={formData.ACOAT || ""}
                    onChange={(e) => handleInputChange('ACOAT', e.target.value)}
                    placeholder="e.g., PT GREEN"
                  />
                </div>

                {/* Color Code - Single field */}
                <div className="mb-4">
                  <Label htmlFor="COLR">Color Code</Label>
                  <Input
                    id="COLR"
                    value={formData.COLR || ""}
                    onChange={(e) => handleInputChange('COLR', e.target.value)}
                    placeholder="e.g., Gray"
                  />
                </div>

                {/* Pantoscopic Tilt - Single field */}
                <div className="mb-4">
                  <Label htmlFor="PANTO">Pantoscopic Tilt</Label>
                  <Input
                    id="PANTO"
                    value={formData.PANTO || ""}
                    onChange={(e) => handleInputChange('PANTO', e.target.value)}
                    placeholder="Pantoscopic tilt"
                  />
                </div>
              </div>

              <Separator />

              {/* Advanced Technical Parameters */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Advanced Technical Parameters</h3>
                
                {/* Diameter 1 - Single field */}
                <div className="mb-4">
                  <Label htmlFor="CRIB">Diameter 1</Label>
                  <Input
                    id="CRIB"
                    value={formData.CRIB || ""}
                    onChange={(e) => handleInputChange('CRIB', e.target.value)}
                    placeholder="e.g., 70"
                  />
                </div>

                {/* Diameter 2 - Single field */}
                <div className="mb-4">
                  <Label htmlFor="ELLH">Diameter 2</Label>
                  <Input
                    id="ELLH"
                    value={formData.ELLH || ""}
                    onChange={(e) => handleInputChange('ELLH', e.target.value)}
                    placeholder="e.g., 70"
                  />
                </div>

                {/* Min Edge/Center Thickness */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Min Edge/Center Thickness</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="MINTHKCD_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="MINTHKCD_L"
                        value={parseVCAValue(formData.MINTHKCD).left}
                        onChange={(e) => handleEyeFieldChange('MINTHKCD', 'left', e.target.value)}
                        placeholder="e.g., 0.51"
                      />
                    </div>
                    <div>
                      <Label htmlFor="MINTHKCD_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="MINTHKCD_R"
                        value={parseVCAValue(formData.MINTHKCD).right}
                        onChange={(e) => handleEyeFieldChange('MINTHKCD', 'right', e.target.value)}
                        placeholder="e.g., 0.51"
                      />
                    </div>
                  </div>
                </div>

                {/* Min Center Thickness */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Min Center Thickness</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="MINCTR_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="MINCTR_L"
                        value={parseVCAValue(formData.MINCTR).left}
                        onChange={(e) => handleEyeFieldChange('MINCTR', 'left', e.target.value)}
                        placeholder="e.g., 1.64"
                      />
                    </div>
                    <div>
                      <Label htmlFor="MINCTR_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="MINCTR_R"
                        value={parseVCAValue(formData.MINCTR).right}
                        onChange={(e) => handleEyeFieldChange('MINCTR', 'right', e.target.value)}
                        placeholder="e.g., 1.64"
                      />
                    </div>
                  </div>
                </div>

                {/* Horizontal Decentration */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Horizontal Decentration</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="BCERIN_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="BCERIN_L"
                        value={parseVCAValue(formData.BCERIN).left}
                        onChange={(e) => handleEyeFieldChange('BCERIN', 'left', e.target.value)}
                        placeholder="e.g., 0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="BCERIN_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="BCERIN_R"
                        value={parseVCAValue(formData.BCERIN).right}
                        onChange={(e) => handleEyeFieldChange('BCERIN', 'right', e.target.value)}
                        placeholder="e.g., 0"
                      />
                    </div>
                  </div>
                </div>

                {/* Vertical Decentration */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Vertical Decentration</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="BCERUP_L" className="text-xs text-gray-500">Left Eye</Label>
                      <Input
                        id="BCERUP_L"
                        value={parseVCAValue(formData.BCERUP).left}
                        onChange={(e) => handleEyeFieldChange('BCERUP', 'left', e.target.value)}
                        placeholder="e.g., 0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="BCERUP_R" className="text-xs text-gray-500">Right Eye</Label>
                      <Input
                        id="BCERUP_R"
                        value={parseVCAValue(formData.BCERUP).right}
                        onChange={(e) => handleEyeFieldChange('BCERUP', 'right', e.target.value)}
                        placeholder="e.g., 0"
                      />
                    </div>
                  </div>
                </div>

                {/* Face Form Tilt - Single field */}
                <div className="mb-4">
                  <Label htmlFor="ZTILT">Face Form Tilt</Label>
                  <Input
                    id="ZTILT"
                    value={formData.ZTILT || ""}
                    onChange={(e) => handleInputChange('ZTILT', e.target.value)}
                    placeholder="Lens surface curve"
                  />
                </div>

                {/* Marked Base Curve - Single field */}
                <div className="mb-4">
                  <Label htmlFor="MBASE">Marked Base Curve</Label>
                  <Input
                    id="MBASE"
                    value={formData.MBASE || ""}
                    onChange={(e) => handleInputChange('MBASE', e.target.value)}
                    placeholder="Base curve"
                  />
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