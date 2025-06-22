"use client"

import React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Copy, X } from "lucide-react"
import { toast } from "sonner"

interface DebugModalProps {
  isOpen: boolean
  onClose: () => void
  data: {
    success: boolean
    orderData: any
    response: any
    vca: string
    timestamp: string
  } | null
}

export default function DebugModal({ isOpen, onClose, data }: DebugModalProps) {
  if (!data) return null

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const formatJSON = (obj: any) => {
    return JSON.stringify(obj, null, 2)
  }

  const parseVCAFields = (vca: string) => {
    return vca.split(';').map(field => {
      const equalIndex = field.indexOf('=')
      if (equalIndex > 0) {
        const key = field.substring(0, equalIndex)
        const value = field.substring(equalIndex + 1)
        return { key, value }
      }
      return { key: field, value: '' }
    }).filter(item => item.key.trim() !== '')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[90vw]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                🐛 Debug Information
                {data.response?.mock && <Badge variant="secondary">MOCK</Badge>}
                <Badge variant={data.success ? "default" : "destructive"}>
                  {data.success ? "SUCCESS" : "ERROR"}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Order submission details • {data.timestamp}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            
            {/* Order Response Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">📋 Order Response</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(formatJSON(data.response), "Response")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Order Number:</span>
                    <p className="font-mono">
                      {typeof data.response?.data === 'object' 
                        ? (data.response.data.Id || data.response.data.Reference || JSON.stringify(data.response.data))
                        : (data.response?.data || 'N/A')
                      }
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p className="font-mono">{data.response?.message || 'N/A'}</p>
                  </div>
                </div>
                
                {/* Show full order data if it's an object */}
                {typeof data.response?.data === 'object' && data.response?.data && (
                  <div className="mt-3">
                    <span className="font-medium">Order Details:</span>
                    <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                      {formatJSON(data.response.data)}
                    </pre>
                  </div>
                )}
                
                {data.response?.orderInfo && (
                  <div className="mt-3">
                    <span className="font-medium">Order Info:</span>
                    <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                      {formatJSON(data.response.orderInfo)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* VCA String */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">🔤 VCA String</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(data.vca, "VCA String")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                  {data.vca}
                </pre>
              </div>
            </div>

            {/* VCA Fields Breakdown */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">📊 VCA Fields Breakdown</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                  {parseVCAFields(data.vca).map(({ key, value }, index) => (
                    <div key={index} className="bg-white p-2 rounded border">
                      <div className="font-medium text-blue-600">{key}</div>
                      <div className="font-mono text-gray-700">{value || '(empty)'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Original Form Data */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">📝 Original Form Data</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(formatJSON(data.orderData), "Form Data")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {formatJSON(data.orderData)}
                </pre>
              </div>
            </div>

            {/* Full Response */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">🔍 Full API Response</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(formatJSON(data.response), "Full Response")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {formatJSON(data.response)}
                </pre>
              </div>
            </div>

            {/* Technical Details */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">⚙️ Technical Details</h3>
              <div className="bg-purple-50 p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">VCA Field Count:</span>
                    <p className="font-mono">{parseVCAFields(data.vca).length}</p>
                  </div>
                  <div>
                    <span className="font-medium">VCA Length:</span>
                    <p className="font-mono">{data.vca.length} characters</p>
                  </div>
                  <div>
                    <span className="font-medium">Form Fields:</span>
                    <p className="font-mono">{Object.keys(data.orderData).length}</p>
                  </div>
                  <div>
                    <span className="font-medium">Response Type:</span>
                    <p className="font-mono">{data.response?.mock ? 'Mock' : 'Real SOAP'}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            onClick={() => copyToClipboard(formatJSON({
              orderData: data.orderData,
              vca: data.vca,
              response: data.response,
              timestamp: data.timestamp
            }), "All Debug Data")}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy All Data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 