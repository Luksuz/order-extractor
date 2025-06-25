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
  const [tintCodeSearchTimer, setTintCodeSearchTimer] = useState<NodeJS.Timeout | null>(null)
  const [coatingCodeSearchTimer, setCoatingCodeSearchTimer] = useState<NodeJS.Timeout | null>(null)

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
          // Format as "CODE/original_customer_name" when match is found
          const formattedShopNumber = `${result.code}|${result.customer.name}`
          setFormData((prev: any) => ({
            ...prev,
            SHOPNUMBER: formattedShopNumber,
            originalCustomerName: value,
            customerMatchInfo: {
              exactMatch: result.exactMatch,
              fuzzyMatch: result.fuzzyMatch,
              matchType: result.matchType,
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

  // Debounced tint code search function
  const debouncedTintCodeSearch = useCallback(async (value: string) => {
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
            TINT: result.code,
            originalTintCode: value,
            tintCodeMatchInfo: {
              exactMatch: result.exactMatch,
              tintCode: result.lensCode,
              alternativeMatches: result.alternativeMatches || []
            }
          }))
        }
      }
    } catch (error) {
      console.error('Error matching tint code:', error)
    }
  }, [])

  // Debounced coating code search function
  const debouncedCoatingCodeSearch = useCallback(async (value: string) => {
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
            ACOAT: result.code,
            originalCoatingCode: value,
            coatingCodeMatchInfo: {
              exactMatch: result.exactMatch,
              coatingCode: result.lensCode,
              alternativeMatches: result.alternativeMatches || []
            }
          }))
        }
      }
    } catch (error) {
      console.error('Error matching coating code:', error)
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

    // Handle lens code matching (LNAM field) with debounce and sync both eyes
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

    // Handle tint code matching with debounce
    if (field === 'TINT') {
      // Clear existing timer
      if (tintCodeSearchTimer) {
        clearTimeout(tintCodeSearchTimer)
      }

      // Update form data immediately
      setFormData((prev: any) => ({
        ...prev,
        [field]: value,
        tintCodeMatchInfo: null,
        originalTintCode: null
      }))

      // Set new timer for database search
      const newTimer = setTimeout(() => {
        debouncedTintCodeSearch(value)
      }, 1000)
      
      setTintCodeSearchTimer(newTimer)
      return
    }

    // Handle coating code matching with debounce
    if (field === 'ACOAT') {
      // Clear existing timer
      if (coatingCodeSearchTimer) {
        clearTimeout(coatingCodeSearchTimer)
      }

      // Update form data immediately
      setFormData((prev: any) => ({
        ...prev,
        [field]: value,
        coatingCodeMatchInfo: null,
        originalCoatingCode: null
      }))

      // Set new timer for database search
      const newTimer = setTimeout(() => {
        debouncedCoatingCodeSearch(value)
      }, 1000)
      
      setCoatingCodeSearchTimer(newTimer)
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
    // Special handling for lens codes - sync both eyes when database match is found
    if (baseField === 'LNAM') {
      // Clear existing timer
      if (lensCodeSearchTimer) {
        clearTimeout(lensCodeSearchTimer)
      }

      // Update the specific eye immediately
      const currentVCA = parseVCAValue(formData[baseField])
      const newVCA = eye === 'right' 
        ? combineToVCA(value, currentVCA.left)
        : combineToVCA(currentVCA.right, value)
      
      setFormData((prev: any) => ({
        ...prev,
        [baseField]: newVCA,
        lensCodeMatchInfo: null,
        originalLensCode: null
      }))

      // Set new timer for database search - will sync both eyes if match found
      const newTimer = setTimeout(async () => {
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
              // Sync both eyes with the matched code
              const syncedVCA = `${result.code};${result.code}`
              setFormData((prev: any) => ({
                ...prev,
                LNAM: syncedVCA,
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
      }, 1000)
      
      setLensCodeSearchTimer(newTimer)
      return
    }

    // Regular handling for other eye fields
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
      if (tintCodeSearchTimer) clearTimeout(tintCodeSearchTimer)
      if (coatingCodeSearchTimer) clearTimeout(coatingCodeSearchTimer)
    }
  }, [customerSearchTimer, lensCodeSearchTimer, tintCodeSearchTimer, coatingCodeSearchTimer])

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
    <div className="h-full flex flex-col bg-white">
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Extracted Order Data</h2>
        <p className="text-sm text-gray-600">Review and edit the extracted prescription data before submitting</p>
      </div>
      
      <div className="flex-1 min-h-0">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {/* Submit Button at Top */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isLoading ? "Submitting..." : "Submit Order"}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-none">
              {/* RxOffice Credentials */}
              <div className="lg:col-span-2">
                <h3 className="text-base font-semibold mb-2">Customer Service Login</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rxoffice_username" className="text-xs">Username</Label>
                    <Input
                      id="rxoffice_username"
                      value={formData.rxoffice_username || ""}
                      onChange={(e) => handleInputChange('rxoffice_username', e.target.value)}
                      placeholder="RxOffice username"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rxoffice_password" className="text-xs">Password</Label>
                    <Input
                      id="rxoffice_password"
                      type="password"
                      value={formData.rxoffice_password || ""}
                      onChange={(e) => handleInputChange('rxoffice_password', e.target.value)}
                      placeholder="RxOffice password"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Basic Order Information */}
              <div className="lg:col-span-2">
                <h3 className="text-base font-semibold mb-2">Basic Information</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="JOB" className="text-xs">Reference</Label>
                      <Input
                        id="JOB"
                        value={formData.JOB || ""}
                        onChange={(e) => handleInputChange('JOB', e.target.value)}
                        placeholder="Order Number"
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={generateOrderId}
                      className="h-8 px-2 text-xs"
                    >
                      Gen
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="ShopNumber" className="text-xs">ERP Query Number</Label>
                    <Input
                      id="ShopNumber"
                      value={formData.ShopNumber || ""}
                      onChange={(e) => handleInputChange('ShopNumber', e.target.value)}
                      placeholder="ERP Query Number"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="CLIENT" className="text-xs">Wearer's Name</Label>
                    <Input
                      id="CLIENT"
                      value={formData.CLIENT || ""}
                      onChange={(e) => handleInputChange('CLIENT', e.target.value)}
                      placeholder="Full name"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                
                <div className="mt-3">
                  <Label htmlFor="SHOPNUMBER" className="text-xs">Customer/Shop Name</Label>
                  <Input
                    id="SHOPNUMBER"
                    value={formData.SHOPNUMBER || ""}
                    onChange={(e) => handleInputChange('SHOPNUMBER', e.target.value)}
                    placeholder="Customer or Shop Name"
                    className="h-8 text-sm"
                  />
                  {formData.customerMatchInfo && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Matched: {formData.customerMatchInfo.customerName}
                    </p>
                  )}
                </div>
              </div>

              {/* Prescription Data */}
              <div className="lg:col-span-2">
                <h3 className="text-base font-semibold mb-2">Prescription</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  {/* Header Row */}
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    <div className="text-xs font-medium text-gray-700 text-center">Eye</div>
                    <div className="text-xs font-medium text-gray-700 text-center">SPH</div>
                    <div className="text-xs font-medium text-gray-700 text-center">CYL</div>
                    <div className="text-xs font-medium text-gray-700 text-center">AXIS</div>
                    <div className="text-xs font-medium text-gray-700 text-center">ADD</div>
                  </div>
                  
                  {/* Right Eye Row */}
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    <div className="flex items-center justify-center">
                      <Label className="text-xs font-medium text-gray-600">R</Label>
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.SPH).right}
                        onChange={(e) => handleEyeFieldChange('SPH', 'right', e.target.value)}
                        placeholder="-1.75"
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.CYL).right}
                        onChange={(e) => handleEyeFieldChange('CYL', 'right', e.target.value)}
                        placeholder="-0.5"
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.AX).right}
                        onChange={(e) => handleEyeFieldChange('AX', 'right', e.target.value)}
                        placeholder="45"
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.ADD).right}
                        onChange={(e) => handleEyeFieldChange('ADD', 'right', e.target.value)}
                        placeholder="1.75"
                        className="h-7 text-center text-xs"
                      />
                    </div>
                  </div>
                  
                  {/* Left Eye Row */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="flex items-center justify-center">
                      <Label className="text-xs font-medium text-gray-600">L</Label>
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.SPH).left}
                        onChange={(e) => handleEyeFieldChange('SPH', 'left', e.target.value)}
                        placeholder="-1.75"
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.CYL).left}
                        onChange={(e) => handleEyeFieldChange('CYL', 'left', e.target.value)}
                        placeholder="-0.25"
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.AX).left}
                        onChange={(e) => handleEyeFieldChange('AX', 'left', e.target.value)}
                        placeholder="180"
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.ADD).left}
                        onChange={(e) => handleEyeFieldChange('ADD', 'left', e.target.value)}
                        placeholder="1.75"
                        className="h-7 text-center text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Frame & Measurements */}
              <div className="lg:col-span-2">
                <h3 className="text-base font-semibold mb-2">Frame & Measurements</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  {/* Header Row */}
                  <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                    <div className="text-xs font-medium text-gray-700 text-center">Eye</div>
                    <div className="text-xs font-medium text-gray-700 text-center">Lens Code</div>
                    <div className="text-xs font-medium text-gray-700 text-center">PD</div>
                    <div className="text-xs font-medium text-gray-700 text-center">NPD</div>
                    <div className="text-xs font-medium text-gray-700 text-center">HT</div>
                    <div className="text-xs font-medium text-gray-700 text-center">[A]</div>
                    <div className="text-xs font-medium text-gray-700 text-center">[B]</div>
                    <div className="text-xs font-medium text-gray-700 text-center">DBL</div>
                    <div className="text-xs font-medium text-gray-700 text-center">ED</div>
                  </div>
                  
                  {/* Right Eye Row */}
                  <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                    <div className="flex items-center justify-center">
                      <Label className="text-xs font-medium text-gray-600">R</Label>
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.LNAM).right}
                        onChange={(e) => handleEyeFieldChange('LNAM', 'right', e.target.value)}
                        placeholder="OVMDXV"
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.IPD).right}
                        onChange={(e) => handleEyeFieldChange('IPD', 'right', e.target.value)}
                        placeholder="28.5"
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.NPD).right}
                        onChange={(e) => handleEyeFieldChange('NPD', 'right', e.target.value)}
                        placeholder=""
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.VBOX).right}
                        onChange={(e) => handleEyeFieldChange('VBOX', 'right', e.target.value)}
                        placeholder="29"
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.HBOX).right}
                        onChange={(e) => handleEyeFieldChange('HBOX', 'right', e.target.value)}
                        placeholder="50.69"
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.SEGHT).right}
                        onChange={(e) => handleEyeFieldChange('SEGHT', 'right', e.target.value)}
                        placeholder="44.83"
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={formData.DBL || ""}
                        onChange={(e) => handleInputChange('DBL', e.target.value)}
                        placeholder="17.74"
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.FED).right}
                        onChange={(e) => handleEyeFieldChange('FED', 'right', e.target.value)}
                        placeholder="54.7"
                        className="h-6 text-center text-xs"
                      />
                    </div>
                  </div>
                  
                  {/* Left Eye Row */}
                  <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                    <div className="flex items-center justify-center">
                      <Label className="text-xs font-medium text-gray-600">L</Label>
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.LNAM).left}
                        onChange={(e) => handleEyeFieldChange('LNAM', 'left', e.target.value)}
                        placeholder="OVMDXV"
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.IPD).left}
                        onChange={(e) => handleEyeFieldChange('IPD', 'left', e.target.value)}
                        placeholder="28.5"
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.NPD).left}
                        onChange={(e) => handleEyeFieldChange('NPD', 'left', e.target.value)}
                        placeholder=""
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.VBOX).left}
                        onChange={(e) => handleEyeFieldChange('VBOX', 'left', e.target.value)}
                        placeholder="29"
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.HBOX).left}
                        onChange={(e) => handleEyeFieldChange('HBOX', 'left', e.target.value)}
                        placeholder="50.69"
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.SEGHT).left}
                        onChange={(e) => handleEyeFieldChange('SEGHT', 'left', e.target.value)}
                        placeholder="44.83"
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      {/* DBL is shared, so disable for left eye */}
                      <Input
                        value=""
                        disabled
                        className="h-6 text-center text-xs bg-gray-100"
                      />
                    </div>
                    <div>
                      <Input
                        value={parseVCAValue(formData.FED).left}
                        onChange={(e) => handleEyeFieldChange('FED', 'left', e.target.value)}
                        placeholder="54.7"
                        className="h-6 text-center text-xs"
                      />
                    </div>
                  </div>
                </div>
                {formData.lensCodeMatchInfo && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Lens Code Matched: {formData.lensCodeMatchInfo.lensCode.retail_name} (synced to both eyes)
                  </p>
                )}
              </div>

              {/* Lens & Coating Options */}
              <div className="lg:col-span-2">
                <h3 className="text-base font-semibold mb-2">Coating Options</h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                    <Label htmlFor="ACOAT" className="text-xs">Coating Code</Label>
                    <Input
                      id="ACOAT"
                      value={formData.ACOAT || ""}
                      onChange={(e) => handleInputChange('ACOAT', e.target.value)}
                      placeholder="PT GREEN"
                      className="h-8 text-sm"
                    />
                    {formData.coatingCodeMatchInfo && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {formData.coatingCodeMatchInfo.coatingCode.retail_name || formData.coatingCodeMatchInfo.coatingCode.name || 'Matched'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="TINT" className="text-xs">Tint Code</Label>
                    <Input
                      id="TINT"
                      value={formData.TINT || ""}
                      onChange={(e) => handleInputChange('TINT', e.target.value)}
                      placeholder="Tint"
                      className="h-8 text-sm"
                    />
                    {formData.tintCodeMatchInfo && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {formData.tintCodeMatchInfo.tintCode.retail_name || formData.tintCodeMatchInfo.tintCode.name || 'Matched'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="COLOR" className="text-xs">Color Code</Label>
                    <Input
                      id="COLOR"
                      value={formData.COLOR || ""}
                      onChange={(e) => handleInputChange('COLOR', e.target.value)}
                      placeholder="Color"
                      className="h-8 text-sm"
                    />
                  </div>
                 
                </div>
                
                {/* Face Form Tilt and Base Curve */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ZTILT" className="text-xs">Face Form Tilt</Label>
                    <Input
                      id="ZTILT"
                      value={formData.ZTILT || ""}
                      onChange={(e) => handleInputChange('ZTILT', e.target.value)}
                      placeholder="R;L format"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="MBASE" className="text-xs">Base Curve</Label>
                    <Input
                      id="MBASE"
                      value={formData.MBASE || ""}
                      onChange={(e) => handleInputChange('MBASE', e.target.value)}
                      placeholder="R;L format"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex-shrink-0 mx-4 mb-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            </div>
          )}
        </form>
      </div>
    </div>
  )
} 