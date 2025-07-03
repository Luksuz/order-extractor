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
    CLIENT: '', // This will be used for display, but SHOPNUMBER will be sent as CLIENT in SOAP
    SHOPNUMBER: '', // This will become the CLIENT field in SOAP submission
    DO: 'B',
    // Default credentials
    rxoffice_username: '',
    rxoffice_password: ''
  })

  // Separate state for customer code and name
  const [customerCode, setCustomerCode] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')

  // Separate state for lens names (what users see) vs codes (what gets stored in VCA)
  const [lensNames, setLensNames] = useState<{right: string, left: string}>({
    right: '',
    left: ''
  })

  // Debounce timers
  const [customerSearchTimer, setCustomerSearchTimer] = useState<NodeJS.Timeout | null>(null)
  const [lensCodeSearchTimer, setLensCodeSearchTimer] = useState<NodeJS.Timeout | null>(null)
  const [tintCodeSearchTimer, setTintCodeSearchTimer] = useState<NodeJS.Timeout | null>(null)
  const [coatingCodeSearchTimer, setCoatingCodeSearchTimer] = useState<NodeJS.Timeout | null>(null)

  // Suggestions state
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([])
  const [lensCodeSuggestions, setLensCodeSuggestions] = useState<any[]>([])
  const [tintCodeSuggestions, setTintCodeSuggestions] = useState<any[]>([])
  const [coatingCodeSuggestions, setCoatingCodeSuggestions] = useState<any[]>([])

  // Dropdown state for all available values
  const [allCustomers, setAllCustomers] = useState<any[]>([])
  const [allLensCodes, setAllLensCodes] = useState<any[]>([])
  const [allTintCodes, setAllTintCodes] = useState<any[]>([])
  const [allCoatingCodes, setAllCoatingCodes] = useState<any[]>([])

  // Show dropdown state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showLensDropdown, setShowLensDropdown] = useState(false)
  const [showTintDropdown, setShowTintDropdown] = useState(false)
  const [showCoatingDropdown, setShowCoatingDropdown] = useState(false)

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
  const debouncedCustomerSearch = useCallback(async (searchValue: string, searchType: 'code' | 'name' | 'combined' = 'combined') => {
    if (!searchValue || searchValue.trim().length < 1) {
      setCustomerSuggestions([])
      setAllCustomers([])
      setShowCustomerDropdown(false)
      return
    }

    try {
      const response = await fetch('/api/match-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: searchValue })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Set all customers for dropdown
        setAllCustomers(result.allCustomers || [])
        setShowCustomerDropdown(true)
        
        if (result.exactMatch && result.matched && result.code) {
          // Auto-fill only on exact match - update both fields
          setCustomerCode(result.customer.code || '')
          setCustomerName(result.customer.name || '')
          
          // Update the combined SHOPNUMBER for VCA compatibility
          const formattedShopNumber = `${result.customer.code}|${result.customer.name}`
          setFormData((prev: any) => ({
            ...prev,
            SHOPNUMBER: formattedShopNumber,
            originalCustomerName: searchValue,
            customerMatchInfo: {
              exactMatch: result.exactMatch,
              fuzzyMatch: result.fuzzyMatch,
              matchType: result.matchType,
              customerName: result.customer.name,
              customerCity: result.customer.city
            }
          }))
          setCustomerSuggestions(result.suggestions || [])
        } else {
          // Show suggestions only, don't auto-fill
          setCustomerSuggestions(result.suggestions || [])
          setFormData((prev: any) => ({
            ...prev,
            customerMatchInfo: null,
            originalCustomerName: null
          }))
        }
      }
    } catch (error) {
      console.error('Error matching customer:', error)
      setCustomerSuggestions([])
      setAllCustomers([])
      setShowCustomerDropdown(false)
    }
  }, [])

  // Debounced lens code search function (updated to search by name)
  const debouncedLensCodeSearch = useCallback(async (value: string) => {
    if (!value || value.trim().length < 1) {
      setLensCodeSuggestions([])
      setAllLensCodes([])
      setShowLensDropdown(false)
      return
    }

    try {
      const response = await fetch('/api/match-lens-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value }) // API still expects 'code' but we're searching by name
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Set all lens codes for dropdown
        setAllLensCodes(result.allLensCodes || [])
        setShowLensDropdown(true)
        
        if (result.exactMatch && result.matched && result.code) {
          // Auto-fill only on exact match - store code but keep the name displayed
          setFormData((prev: any) => ({
            ...prev,
            LNAM: result.code, // Store the code for VCA
            originalLensCode: value,
            lensCodeMatchInfo: {
              exactMatch: result.exactMatch,
              lensCode: result.lensCode
            }
          }))
          setLensCodeSuggestions(result.suggestions || [])
        } else {
          // Show suggestions only, don't auto-fill
          setLensCodeSuggestions(result.suggestions || [])
          setFormData((prev: any) => ({
            ...prev,
            lensCodeMatchInfo: null,
            originalLensCode: null
          }))
        }
      }
    } catch (error) {
      console.error('Error matching lens code:', error)
      setLensCodeSuggestions([])
      setAllLensCodes([])
      setShowLensDropdown(false)
    }
  }, [])

  // Debounced tint code search function
  const debouncedTintCodeSearch = useCallback(async (value: string) => {
    if (!value || value.trim().length < 1) {
      setTintCodeSuggestions([])
      setAllTintCodes([])
      setShowTintDropdown(false)
      return
    }

    try {
      const response = await fetch('/api/match-tint-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Set all tint codes for dropdown
        setAllTintCodes(result.allTintCodes || [])
        setShowTintDropdown(true)
        
        if (result.exactMatch && result.matched && result.code) {
          // Auto-fill only on exact match
          setFormData((prev: any) => ({
            ...prev,
            TINT: result.code,
            originalTintCode: value,
            tintCodeMatchInfo: {
              exactMatch: result.exactMatch,
              tintCode: result.tintCode
            }
          }))
          setTintCodeSuggestions(result.suggestions || [])
        } else {
          // Show suggestions only, don't auto-fill
          setTintCodeSuggestions(result.suggestions || [])
          setFormData((prev: any) => ({
            ...prev,
            tintCodeMatchInfo: null,
            originalTintCode: null
          }))
        }
      }
    } catch (error) {
      console.error('Error matching tint code:', error)
      setTintCodeSuggestions([])
      setAllTintCodes([])
      setShowTintDropdown(false)
    }
  }, [])

  // Debounced coating code search function
  const debouncedCoatingCodeSearch = useCallback(async (value: string) => {
    if (!value || value.trim().length < 1) {
      setCoatingCodeSuggestions([])
      setAllCoatingCodes([])
      setShowCoatingDropdown(false)
      return
    }

    try {
      const response = await fetch('/api/match-coating-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Set all coating codes for dropdown
        setAllCoatingCodes(result.allCoatingCodes || [])
        setShowCoatingDropdown(true)
        
        if (result.exactMatch && result.matched && result.code) {
          // Auto-fill only on exact match
          setFormData((prev: any) => ({
            ...prev,
            ACOAT: result.code,
            originalCoatingCode: value,
            coatingCodeMatchInfo: {
              exactMatch: result.exactMatch,
              coatingCode: result.coatingCode
            }
          }))
          setCoatingCodeSuggestions(result.suggestions || [])
        } else {
          // Show suggestions only, don't auto-fill
          setCoatingCodeSuggestions(result.suggestions || [])
          setFormData((prev: any) => ({
            ...prev,
            coatingCodeMatchInfo: null,
            originalCoatingCode: null
          }))
        }
      }
    } catch (error) {
      console.error('Error matching coating code:', error)
      setCoatingCodeSuggestions([])
      setAllCoatingCodes([])
      setShowCoatingDropdown(false)
    }
  }, [])

  // Helper function to select a suggestion
  const selectCustomerSuggestion = (suggestion: any) => {
    // Update both separate fields
    setCustomerCode(suggestion.code || '')
    setCustomerName(suggestion.name || '')
    
    // Update the combined SHOPNUMBER for VCA compatibility
    const formattedShopNumber = `${suggestion.code}|${suggestion.name}`
    setFormData((prev: any) => ({
      ...prev,
      SHOPNUMBER: formattedShopNumber,
      customerMatchInfo: {
        exactMatch: false,
        fuzzyMatch: true,
        matchType: suggestion.matchType,
        customerName: suggestion.name,
        customerCity: suggestion.city
      }
    }))
    setCustomerSuggestions([])
  }

  // Helper function to select a lens suggestion (updated to work with names)
  const selectLensCodeSuggestion = (suggestion: any) => {
    // Set both eyes to the same name and code
    setLensNames({
      right: suggestion.retail_name || suggestion.retail_code,
      left: suggestion.retail_name || suggestion.retail_code
    })
    
    setFormData((prev: any) => ({
      ...prev,
      LNAM: `${suggestion.retail_code};${suggestion.retail_code}`, // Store codes in VCA format
      lensCodeMatchInfo: {
        exactMatch: false,
        lensCode: {
          retail_name: suggestion.retail_name,
          retail_code: suggestion.retail_code,
          source: suggestion.source
        }
      }
    }))
    setLensCodeSuggestions([])
  }

  const selectTintCodeSuggestion = (suggestion: any) => {
    setFormData((prev: any) => ({
      ...prev,
      TINT: suggestion.retail_code,
      tintCodeMatchInfo: {
        exactMatch: false,
        tintCode: {
          retail_name: suggestion.retail_name,
          retail_code: suggestion.retail_code,
          source: suggestion.source
        }
      }
    }))
    setTintCodeSuggestions([])
  }

  const selectCoatingCodeSuggestion = (suggestion: any) => {
    setFormData((prev: any) => ({
      ...prev,
      ACOAT: suggestion.retail_code,
      coatingCodeMatchInfo: {
        exactMatch: false,
        coatingCode: {
          retail_name: suggestion.retail_name,
          retail_code: suggestion.retail_code,
          source: suggestion.source
        }
      }
    }))
    setCoatingCodeSuggestions([])
  }

  useEffect(() => {
    // Load cached credentials first
    const cachedCredentials = localStorage.getItem('rxoffice_credentials')
    let credentialsFromCache = {}
    
    if (cachedCredentials) {
      try {
        const credentials = JSON.parse(cachedCredentials)
        credentialsFromCache = {
          rxoffice_username: credentials.userName,
          rxoffice_password: credentials.password
        }
      } catch (error) {
        console.warn('Failed to parse cached credentials:', error)
      }
    }

    if (orderData) {
      setFormData((prevData: any) => {
        // Only update if there's actually new data to prevent unnecessary re-renders
        const newData = {
          ...prevData, // Keep defaults
          ...credentialsFromCache, // Apply cached credentials
          ...orderData // Override with extracted data (but not credentials if they exist in cache)
        }
        
        // Simple comparison to avoid unnecessary updates
        if (JSON.stringify(newData) === JSON.stringify(prevData)) {
          return prevData
        }
        
        return newData
      })
      
      // Initialize lens names from extracted data if LNAM exists
      if (orderData.LNAM) {
        const parsedLensCode = parseVCAValue(orderData.LNAM)
        // For now, display codes as names since we don't have the names from extraction
        // In a real scenario, you'd want to look up the names from the codes
        setLensNames(prev => {
          const newLensNames = {
            right: parsedLensCode.right,
            left: parsedLensCode.left
          }
          
          // Only update if values actually changed
          if (prev.right === newLensNames.right && prev.left === newLensNames.left) {
            return prev
          }
          
          return newLensNames
        })
        
        // Trigger lens code matching for extracted lens codes
        if (parsedLensCode.right) {
          setTimeout(() => {
            performLensCodeSearch(parsedLensCode.right)
          }, 500)
        }
      }

      // Trigger customer matching if SHOPNUMBER exists
      if (orderData.SHOPNUMBER) {
        // Split SHOPNUMBER into code and name if it contains |
        if (orderData.SHOPNUMBER.includes('|')) {
          const [code, ...nameParts] = orderData.SHOPNUMBER.split('|')
          setCustomerCode(code || '')
          setCustomerName(nameParts.join('|') || '') // Rejoin in case name contains |
        } else {
          // If no | separator, treat as customer name
          setCustomerCode('')
          setCustomerName(orderData.SHOPNUMBER || '')
        }
        
        setTimeout(() => {
          debouncedCustomerSearch(orderData.SHOPNUMBER)
        }, 100)
      }

      // Trigger tint code matching if TINT exists
      if (orderData.TINT) {
        setTimeout(() => {
          debouncedTintCodeSearch(orderData.TINT)
        }, 300)
      }

      // Trigger coating code matching if ACOAT exists
      if (orderData.ACOAT) {
        setTimeout(() => {
          debouncedCoatingCodeSearch(orderData.ACOAT)
        }, 400)
      }

    } else if (Object.keys(credentialsFromCache).length > 0) {
      // Apply cached credentials even if no orderData
      setFormData((prevData: any) => {
        const newData = {
          ...prevData,
          ...credentialsFromCache
        }
        
        // Only update if credentials actually changed
        if (prevData.rxoffice_username === newData.rxoffice_username && 
            prevData.rxoffice_password === newData.rxoffice_password) {
          return prevData
        }
        
        return newData
      })
    }
  }, [orderData])

  const handleInputChange = async (field: string, value: string) => {
    // Handle customer name matching for SHOPNUMBER field with debounce
    if (field === 'SHOPNUMBER') {
      // Clear existing timer and suggestions
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
      setCustomerSuggestions([])

      // Set new timer for database search
      const newTimer = setTimeout(() => {
        debouncedCustomerSearch(value)
      }, 1000)
      
      setCustomerSearchTimer(newTimer)
      return
    }

    // Handle lens code matching (LNAM field) with debounce and sync both eyes
    if (field === 'LNAM') {
      // Clear existing timer and suggestions
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
      setLensCodeSuggestions([])

      // Set new timer for database search
      const newTimer = setTimeout(() => {
        performLensCodeSearch(value)
      }, 1000)
      
      setLensCodeSearchTimer(newTimer)
      return
    }

    // Handle tint code matching with debounce
    if (field === 'TINT') {
      // Clear existing timer and suggestions
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
      setTintCodeSuggestions([])

      // Set new timer for database search
      const newTimer = setTimeout(() => {
        debouncedTintCodeSearch(value)
      }, 1000)
      
      setTintCodeSearchTimer(newTimer)
      return
    }

    // Handle coating code matching with debounce
    if (field === 'ACOAT') {
      // Clear existing timer and suggestions
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
      setCoatingCodeSuggestions([])

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

  // Handle customer code changes
  const handleCustomerCodeChange = (value: string) => {
    setCustomerCode(value)
    
    // Clear existing timer
    if (customerSearchTimer) {
      clearTimeout(customerSearchTimer)
    }

    // Update combined SHOPNUMBER
    const combinedValue = value && customerName ? `${value}|${customerName}` : value || customerName
    setFormData((prev: any) => ({
      ...prev,
      SHOPNUMBER: combinedValue,
      customerMatchInfo: null,
      originalCustomerName: null
    }))
    setCustomerSuggestions([])

    // Trigger search if we have a meaningful value
    if (value && value.trim().length >= 1) {
      const newTimer = setTimeout(() => {
        debouncedCustomerSearch(value, 'code')
      }, 1000)
      setCustomerSearchTimer(newTimer)
    }
  }

  // Handle customer name changes
  const handleCustomerNameChange = (value: string) => {
    setCustomerName(value)
    
    // Clear existing timer
    if (customerSearchTimer) {
      clearTimeout(customerSearchTimer)
    }

    // Update combined SHOPNUMBER
    const combinedValue = customerCode && value ? `${customerCode}|${value}` : customerCode || value
    setFormData((prev: any) => ({
      ...prev,
      SHOPNUMBER: combinedValue,
      customerMatchInfo: null,
      originalCustomerName: null
    }))
    setCustomerSuggestions([])

    // Trigger search if we have a meaningful value
    if (value && value.trim().length >= 1) {
      const newTimer = setTimeout(() => {
        debouncedCustomerSearch(value, 'name')
      }, 1000)
      setCustomerSearchTimer(newTimer)
    }
  }

  // Handle lens name field changes (new function)
  const handleLensNameChange = (eye: 'right' | 'left', value: string) => {
    // Clear existing timer and suggestions
    if (lensCodeSearchTimer) {
      clearTimeout(lensCodeSearchTimer)
    }

    // Update lens names immediately
    setLensNames(prev => ({
      ...prev,
      [eye]: value
    }))
    
    // Clear existing match info
    setFormData((prev: any) => ({
      ...prev,
      lensCodeMatchInfo: null,
      originalLensCode: null
    }))
    setLensCodeSuggestions([])

    // Set new timer for database search
    const newTimer = setTimeout(() => {
      performLensCodeSearch(value)
    }, 1000)
    
    setLensCodeSearchTimer(newTimer)
  }

  // Separate function for lens code search to avoid closure issues
  const performLensCodeSearch = async (value: string) => {
    if (!value || value.trim().length < 2) return

    try {
      const response = await fetch('/api/match-lens-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.exactMatch && result.matched && result.code) {
          // Sync both eyes with the matched code and name only on exact match
          const syncedCode = `${result.code};${result.code}`
          const matchedName = result.lensCode.retail_name || result.code
          
          setLensNames({
            right: matchedName,
            left: matchedName
          })
          
          setFormData((prev: any) => ({
            ...prev,
            LNAM: syncedCode,
            originalLensCode: value,
            lensCodeMatchInfo: {
              exactMatch: result.exactMatch,
              lensCode: result.lensCode
            }
          }))
          setLensCodeSuggestions(result.suggestions || [])
        } else {
          // Show suggestions only, don't auto-fill
          setLensCodeSuggestions(result.suggestions || [])
        }
      }
    } catch (error) {
      console.error('Error matching lens code:', error)
      setLensCodeSuggestions([])
    }
  }

  // Handle separate eye field changes (only for prescription fields)
  const handleEyeFieldChange = (baseField: string, eye: 'right' | 'left', value: string) => {
    // Regular handling for all eye fields including lens codes
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
      
      // Clear all suggestions and dropdowns on unmount
      setCustomerSuggestions([])
      setLensCodeSuggestions([])
      setTintCodeSuggestions([])
      setCoatingCodeSuggestions([])
      setAllCustomers([])
      setAllLensCodes([])
      setAllTintCodes([])
      setAllCoatingCodes([])
      setShowCustomerDropdown(false)
      setShowLensDropdown(false)
      setShowTintDropdown(false)
      setShowCoatingDropdown(false)
      
      // Clear customer fields
      setCustomerCode('')
      setCustomerName('')
    }
  }, []) // Empty dependency array - only run on unmount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Ensure SHOPNUMBER is properly combined from the separate fields
    let combinedShopNumber = formData.SHOPNUMBER
    if (customerCode || customerName) {
      combinedShopNumber = customerCode && customerName 
        ? `${customerCode}|${customerName}` 
        : customerCode || customerName
    }
    
    // Submit the order data
    const submissionData = {
      ...formData,
      // Update SHOPNUMBER with the combined value
      SHOPNUMBER: combinedShopNumber,
      // CLIENT field should contain the shop/customer information from SHOPNUMBER
      // DO NOT change this mapping - it's critical for the SOAP order submission
      // The SOAP service expects CLIENT to contain the actual customer/shop name
      CLIENT: combinedShopNumber || formData.CLIENT, // Use combined SHOPNUMBER as CLIENT for SOAP order
    }
    
    console.log('📤 Form submitting with data:', submissionData)
    console.log('🔍 Customer Code:', customerCode)
    console.log('🔍 Customer Name:', customerName)
    console.log('🔍 Combined SHOPNUMBER:', combinedShopNumber)
    onSubmit(submissionData)
  }

  // Handle Enter key navigation
  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Prevent form submission
      
      if (nextFieldId) {
        const nextField = document.getElementById(nextFieldId)
        if (nextField) {
          nextField.focus()
        }
      }
    }
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
      
      <div className="flex-1 min-h-0">
        <form 
          onSubmit={handleSubmit} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target !== e.currentTarget) {
              e.preventDefault() // Prevent form submission on Enter
            }
          }}
          className="h-full flex flex-col"
        >
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
                      onKeyDown={(e) => handleKeyDown(e, 'rxoffice_password')}
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
                      onKeyDown={(e) => handleKeyDown(e, 'JOB')}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Basic Order Information */}
              <div className="lg:col-span-2">
                <h3 className="text-base font-semibold mb-2">Basic Information</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="JOB" className="text-xs">Reference</Label>
                    <Input
                      id="JOB"
                      value={formData.JOB || ""}
                      onChange={(e) => handleInputChange('JOB', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'ShopNumber')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ShopNumber" className="text-xs">ERP Query Number</Label>
                    <Input
                      id="ShopNumber"
                      value={formData.ShopNumber || ""}
                      onChange={(e) => handleInputChange('ShopNumber', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'CLIENT')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="CLIENT" className="text-xs">Wearer's Name</Label>
                    <Input
                      id="CLIENT"
                      value={formData.CLIENT || ""}
                      onChange={(e) => handleInputChange('CLIENT', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'SHOPNUMBER')}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="customer-code" className="text-xs">Customer Code</Label>
                      <div className="relative">
                        <Input
                          id="customer-code"
                          value={customerCode}
                          onChange={(e) => handleCustomerCodeChange(e.target.value)}
                          onFocus={() => setShowCustomerDropdown(true)}
                          onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                          onKeyDown={(e) => handleKeyDown(e, 'customer-name')}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="customer-name" className="text-xs">Customer Name</Label>
                      <div className="relative">
                        <Input
                          id="customer-name"
                          value={customerName}
                          onChange={(e) => handleCustomerNameChange(e.target.value)}
                          onFocus={() => setShowCustomerDropdown(true)}
                          onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                          onKeyDown={(e) => handleKeyDown(e, 'lens-name-search')}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1">💡 Start typing in either field to see automatic suggestions from database</p>
                  
                  {formData.customerMatchInfo && formData.customerMatchInfo.exactMatch && (
                    <p className="text-xs text-green-600 mt-1">
                      ✅ Exact match: {formData.customerMatchInfo.customerName}
                    </p>
                  )}
                  
                  {/* Dropdown with all customers and highlighted matches */}
                  {showCustomerDropdown && (allCustomers.length > 0 || customerSuggestions.length > 0) && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {/* Matched suggestions first */}
                      {customerSuggestions.length > 0 && (
                        <div>
                          <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-blue-50 border-b">
                            💡 Best Matches ({customerSuggestions.length})
                          </div>
                          {customerSuggestions.map((suggestion, index) => (
                            <button
                              key={`suggestion-${index}`}
                              type="button"
                              onClick={() => selectCustomerSuggestion(suggestion)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-100 border-b border-gray-100 text-sm"
                            >
                              <div className="font-medium text-blue-700">{suggestion.name}</div>
                              <div className="text-xs text-gray-500">
                                {suggestion.code} {suggestion.city && `• ${suggestion.city}`}
                                {suggestion.matchPercentage && ` • ${suggestion.matchPercentage.toFixed(0)}% match`}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* All customers dropdown */}
                      {allCustomers.length > 0 && (
                        <div>
                          {allCustomers.slice(0, 20).map((customer, index) => (
                            <button
                              key={`all-${index}`}
                              type="button"
                              onClick={() => selectCustomerSuggestion(customer)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 text-sm"
                            >
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs text-gray-500">
                                {customer.code} {customer.city && `• ${customer.city}`}
                              </div>
                            </button>
                          ))}
                          {allCustomers.length > 20 && (
                            <div className="px-3 py-2 text-xs text-gray-500 text-center">
                              ... and {allCustomers.length - 20} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Prescription Data */}
              <div className="lg:col-span-2">
                <h3 className="text-base font-semibold mb-2">Prescription</h3>
                
                {/* Lens Name Search Field */}
                <div className="mb-3">
                  <Label htmlFor="lens-name-search" className="text-xs">Lens Name</Label>
                  <div className="relative">
                    <Input
                      id="lens-name-search"
                      value={lensNames.right || lensNames.left || ""}
                      onChange={(e) => handleLensNameChange('right', e.target.value)}
                      onFocus={() => setShowLensDropdown(true)}
                      onBlur={() => setTimeout(() => setShowLensDropdown(false), 200)}
                      onKeyDown={(e) => handleKeyDown(e, 'right-lens-code')}
                      className="h-8 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">💡 Start typing to see automatic suggestions from lens database</p>
                    
                    {formData.lensCodeMatchInfo && formData.lensCodeMatchInfo.exactMatch && (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Exact match: {formData.lensCodeMatchInfo.lensCode.retail_name || formData.lensCodeMatchInfo.lensCode.retail_code} (synced to both eyes)
                      </p>
                    )}
                    
                    {/* Dropdown with all lens codes and highlighted matches */}
                    {showLensDropdown && (allLensCodes.length > 0 || lensCodeSuggestions.length > 0) && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {/* Matched suggestions first */}
                        {lensCodeSuggestions.length > 0 && (
                          <div>
                            <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-blue-50 border-b">
                              💡 Best Matches ({lensCodeSuggestions.length})
                            </div>
                            {lensCodeSuggestions.map((suggestion, index) => (
                              <button
                                key={`lens-suggestion-${index}`}
                                type="button"
                                onClick={() => selectLensCodeSuggestion(suggestion)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-100 border-b border-gray-100 text-sm"
                              >
                                <div className="font-medium text-blue-700">{suggestion.retail_name}</div>
                                <div className="text-xs text-gray-500">
                                  {suggestion.retail_code} • {suggestion.source}
                                  {suggestion.matchPercentage && ` • ${suggestion.matchPercentage.toFixed(0)}% match`}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* All lens codes dropdown */}
                        {allLensCodes.length > 0 && (
                          <div>
                            {allLensCodes.slice(0, 20).map((lens, index) => (
                              <button
                                key={`lens-all-${index}`}
                                type="button"
                                onClick={() => selectLensCodeSuggestion(lens)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 text-sm"
                              >
                                <div className="font-medium">{lens.retail_name}</div>
                                <div className="text-xs text-gray-500">
                                  {lens.retail_code} • {lens.source}
                                </div>
                              </button>
                            ))}
                            {allLensCodes.length > 20 && (
                              <div className="px-3 py-2 text-xs text-gray-500 text-center">
                                ... and {allLensCodes.length - 20} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  {/* Header Row */}
                  <div className="grid grid-cols-6 gap-2 mb-2">
                    <div className="text-xs font-medium text-gray-700 text-center">Eye</div>
                    <div className="text-xs font-medium text-gray-700 text-center">
                      {lensNames.right || lensNames.left || "Lens Code"}
                    </div>
                    <div className="text-xs font-medium text-gray-700 text-center">SPH</div>
                    <div className="text-xs font-medium text-gray-700 text-center">CYL</div>
                    <div className="text-xs font-medium text-gray-700 text-center">AXIS</div>
                    <div className="text-xs font-medium text-gray-700 text-center">ADD</div>
                  </div>
                  
                  {/* Right Eye Row */}
                  <div className="grid grid-cols-6 gap-2 mb-2">
                    <div className="flex items-center justify-center">
                      <Label className="text-xs font-medium text-gray-600">R</Label>
                    </div>
                    <div>
                      <Input
                        id="right-lens-code"
                        value={parseVCAValue(formData.LNAM).right}
                        onChange={(e) => handleEyeFieldChange('LNAM', 'right', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'right-sph')}
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="right-sph"
                        type="number"
                        step="0.25"
                        value={parseVCAValue(formData.SPH).right}
                        onChange={(e) => handleEyeFieldChange('SPH', 'right', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'right-cyl')}
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="right-cyl"
                        type="number"
                        step="0.25"
                        value={parseVCAValue(formData.CYL).right}
                        onChange={(e) => handleEyeFieldChange('CYL', 'right', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'right-axis')}
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="right-axis"
                        type="number"
                        step="1"
                        min="0"
                        max="180"
                        value={parseVCAValue(formData.AX).right}
                        onChange={(e) => handleEyeFieldChange('AX', 'right', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'right-add')}
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="right-add"
                        type="number"
                        step="0.25"
                        min="0"
                        value={parseVCAValue(formData.ADD).right}
                        onChange={(e) => handleEyeFieldChange('ADD', 'right', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'left-lens-code')}
                        className="h-7 text-center text-xs"
                      />
                    </div>
                  </div>
                  
                  {/* Left Eye Row */}
                  <div className="grid grid-cols-6 gap-2">
                    <div className="flex items-center justify-center">
                      <Label className="text-xs font-medium text-gray-600">L</Label>
                    </div>
                    <div>
                      <Input
                        id="left-lens-code"
                        value={parseVCAValue(formData.LNAM).left}
                        onChange={(e) => handleEyeFieldChange('LNAM', 'left', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'left-sph')}
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="left-sph"
                        type="number"
                        step="0.25"
                        value={parseVCAValue(formData.SPH).left}
                        onChange={(e) => handleEyeFieldChange('SPH', 'left', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'left-cyl')}
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="left-cyl"
                        type="number"
                        step="0.25"
                        value={parseVCAValue(formData.CYL).left}
                        onChange={(e) => handleEyeFieldChange('CYL', 'left', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'left-axis')}
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="left-axis"
                        type="number"
                        step="1"
                        min="0"
                        max="180"
                        value={parseVCAValue(formData.AX).left}
                        onChange={(e) => handleEyeFieldChange('AX', 'left', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'left-add')}
                        className="h-7 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="left-add"
                        type="number"
                        step="0.25"
                        min="0"
                        value={parseVCAValue(formData.ADD).left}
                        onChange={(e) => handleEyeFieldChange('ADD', 'left', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'right-pd')}
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
                  <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                    <div className="text-xs font-medium text-gray-700 text-center">Eye</div>
                    <div className="text-xs font-medium text-gray-700 text-center">PD</div>
                    <div className="text-xs font-medium text-gray-700 text-center">NPD</div>
                    <div className="text-xs font-medium text-gray-700 text-center">HT</div>
                    <div className="text-xs font-medium text-gray-700 text-center">[A]</div>
                    <div className="text-xs font-medium text-gray-700 text-center">[B]</div>
                    <div className="text-xs font-medium text-gray-700 text-center">DBL</div>
                    <div className="text-xs font-medium text-gray-700 text-center">ED</div>
                  </div>
                  
                  {/* Right Eye Row */}
                  <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                    <div className="flex items-center justify-center">
                      <Label className="text-xs font-medium text-gray-600">R</Label>
                    </div>
                    <div>
                      <Input
                        id="right-pd"
                        type="number"
                        step="0.5"
                        min="0"
                        value={parseVCAValue(formData.IPD).right}
                        onChange={(e) => handleEyeFieldChange('IPD', 'right', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'right-npd')}
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="right-npd"
                        type="number"
                        step="0.5"
                        min="0"
                        value={parseVCAValue(formData.NPD).right}
                        onChange={(e) => handleEyeFieldChange('NPD', 'right', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'right-ht')}
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="right-ht"
                        type="number"
                        step="0.1"
                        min="0"
                        value={parseVCAValue(formData.SEGHT).right}
                        onChange={(e) => handleEyeFieldChange('SEGHT', 'right', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'right-a')}
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="right-a"
                        type="number"
                        step="0.01"
                        min="0"
                        value={parseVCAValue(formData.HBOX).right}
                        onChange={(e) => handleEyeFieldChange('HBOX', 'right', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'right-b')}
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="right-b"
                        type="number"
                        step="0.01"
                        min="0"
                        value={parseVCAValue(formData.VBOX).right}
                        onChange={(e) => handleEyeFieldChange('VBOX', 'right', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'dbl')}
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="dbl"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.DBL || ""}
                        onChange={(e) => handleInputChange('DBL', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'right-ed')}
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="right-ed"
                        type="number"
                        step="0.1"
                        min="0"
                        value={parseVCAValue(formData.FED).right}
                        onChange={(e) => handleEyeFieldChange('FED', 'right', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'left-pd')}
                        className="h-6 text-center text-xs"
                      />
                    </div>
                  </div>
                  
                  {/* Left Eye Row */}
                  <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                    <div className="flex items-center justify-center">
                      <Label className="text-xs font-medium text-gray-600">L</Label>
                    </div>
                    <div>
                      <Input
                        id="left-pd"
                        type="number"
                        step="0.5"
                        min="0"
                        value={parseVCAValue(formData.IPD).left}
                        onChange={(e) => handleEyeFieldChange('IPD', 'left', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'left-npd')}
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="left-npd"
                        type="number"
                        step="0.5"
                        min="0"
                        value={parseVCAValue(formData.NPD).left}
                        onChange={(e) => handleEyeFieldChange('NPD', 'left', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'left-ht')}
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="left-ht"
                        type="number"
                        step="0.1"
                        min="0"
                        value={parseVCAValue(formData.SEGHT).left}
                        onChange={(e) => handleEyeFieldChange('SEGHT', 'left', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'left-a')}
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="left-a"
                        type="number"
                        step="0.01"
                        min="0"
                        value={parseVCAValue(formData.HBOX).left}
                        onChange={(e) => handleEyeFieldChange('HBOX', 'left', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'left-b')}
                        className="h-6 text-center text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        id="left-b"
                        type="number"
                        step="0.01"
                        min="0"
                        value={parseVCAValue(formData.VBOX).left}
                        onChange={(e) => handleEyeFieldChange('VBOX', 'left', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'left-ed')}
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
                        id="left-ed"
                        type="number"
                        step="0.1"
                        min="0"
                        value={parseVCAValue(formData.FED).left}
                        onChange={(e) => handleEyeFieldChange('FED', 'left', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'ACOAT')}
                        className="h-6 text-center text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lens & Coating Options */}
              <div className="lg:col-span-2">
                <h3 className="text-base font-semibold mb-2">Coating Options</h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                    <Label htmlFor="ACOAT" className="text-xs">Coating Code</Label>
                    <div className="relative">
                      <Input
                        id="ACOAT"
                        value={formData.ACOAT || ""}
                        onChange={(e) => handleInputChange('ACOAT', e.target.value)}
                        onFocus={() => setShowCoatingDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCoatingDropdown(false), 200)}
                        onKeyDown={(e) => handleKeyDown(e, 'TINT')}
                        className="h-8 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">💡 Auto-suggests from database</p>
                      
                      {formData.coatingCodeMatchInfo && formData.coatingCodeMatchInfo.exactMatch && (
                        <p className="text-xs text-green-600 mt-1">
                          ✅ Exact match: {formData.coatingCodeMatchInfo.coatingCode.retail_name || formData.coatingCodeMatchInfo.coatingCode.name || 'Matched'}
                        </p>
                      )}
                      
                      {/* Dropdown with all coating codes and highlighted matches */}
                      {showCoatingDropdown && (allCoatingCodes.length > 0 || coatingCodeSuggestions.length > 0) && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {/* Matched suggestions first */}
                          {coatingCodeSuggestions.length > 0 && (
                            <div>
                              <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-blue-50 border-b">
                                💡 Best Matches ({coatingCodeSuggestions.length})
                              </div>
                              {coatingCodeSuggestions.map((suggestion, index) => (
                                <button
                                  key={`coating-suggestion-${index}`}
                                  type="button"
                                  onClick={() => selectCoatingCodeSuggestion(suggestion)}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-100 border-b border-gray-100 text-sm"
                                >
                                  <div className="font-medium text-blue-700">{suggestion.retail_code}</div>
                                  <div className="text-xs text-gray-500">
                                    {suggestion.retail_name}
                                    {suggestion.matchPercentage && ` • ${suggestion.matchPercentage.toFixed(0)}% match`}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {/* All coating codes dropdown */}
                          {allCoatingCodes.length > 0 && (
                            <div>
                              {allCoatingCodes.slice(0, 15).map((coating, index) => (
                                <button
                                  key={`coating-all-${index}`}
                                  type="button"
                                  onClick={() => selectCoatingCodeSuggestion(coating)}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 text-sm"
                                >
                                  <div className="font-medium">{coating.retail_code}</div>
                                  <div className="text-xs text-gray-500">{coating.retail_name}</div>
                                </button>
                              ))}
                              {allCoatingCodes.length > 15 && (
                                <div className="px-3 py-2 text-xs text-gray-500 text-center">
                                  ... and {allCoatingCodes.length - 15} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="TINT" className="text-xs">Tint Code</Label>
                    <div className="relative">
                      <Input
                        id="TINT"
                        value={formData.TINT || ""}
                        onChange={(e) => handleInputChange('TINT', e.target.value)}
                        onFocus={() => setShowTintDropdown(true)}
                        onBlur={() => setTimeout(() => setShowTintDropdown(false), 200)}
                        onKeyDown={(e) => handleKeyDown(e, 'COLOR')}
                        className="h-8 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">💡 Auto-suggests from database</p>
                      
                      {formData.tintCodeMatchInfo && formData.tintCodeMatchInfo.exactMatch && (
                        <p className="text-xs text-green-600 mt-1">
                          ✅ Exact match: {formData.tintCodeMatchInfo.tintCode.retail_name || formData.tintCodeMatchInfo.tintCode.name || 'Matched'}
                        </p>
                      )}
                      
                      {/* Dropdown with all tint codes and highlighted matches */}
                      {showTintDropdown && (allTintCodes.length > 0 || tintCodeSuggestions.length > 0) && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {/* Matched suggestions first */}
                          {tintCodeSuggestions.length > 0 && (
                            <div>
                              <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-blue-50 border-b">
                                💡 Best Matches ({tintCodeSuggestions.length})
                              </div>
                              {tintCodeSuggestions.map((suggestion, index) => (
                                <button
                                  key={`tint-suggestion-${index}`}
                                  type="button"
                                  onClick={() => selectTintCodeSuggestion(suggestion)}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-100 border-b border-gray-100 text-sm"
                                >
                                  <div className="font-medium text-blue-700">{suggestion.retail_code}</div>
                                  <div className="text-xs text-gray-500">
                                    {suggestion.retail_name}
                                    {suggestion.matchPercentage && ` • ${suggestion.matchPercentage.toFixed(0)}% match`}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {/* All tint codes dropdown */}
                          {allTintCodes.length > 0 && (
                            <div>
                              
                              {allTintCodes.slice(0, 15).map((tint, index) => (
                                <button
                                  key={`tint-all-${index}`}
                                  type="button"
                                  onClick={() => selectTintCodeSuggestion(tint)}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 text-sm"
                                >
                                  <div className="font-medium">{tint.retail_code}</div>
                                  <div className="text-xs text-gray-500">{tint.retail_name}</div>
                                </button>
                              ))}
                              {allTintCodes.length > 15 && (
                                <div className="px-3 py-2 text-xs text-gray-500 text-center">
                                  ... and {allTintCodes.length - 15} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="COLOR" className="text-xs">Color Code</Label>
                    <Input
                      id="COLOR"
                      value={formData.COLOR || ""}
                      onChange={(e) => handleInputChange('COLOR', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'rxoffice_username')}
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