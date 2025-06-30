"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Eye, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package, 
  Truck,
  AlertCircle,
  Database,
  FileText
} from "lucide-react"

interface ResultViewerProps {
  intent?: string
  parsedData?: any
  ediResult?: any
  inputType?: "text" | "image"
  isLoading?: boolean
  error?: string | null
}

export default function ResultViewer({ 
  intent, 
  parsedData, 
  ediResult, 
  inputType,
  isLoading = false,
  error 
}: ResultViewerProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-gray-500">Processing your request...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full border-red-200">
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-2">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-red-600 font-medium">Error Processing Request</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!intent || !parsedData) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-2">
            <FileText className="h-12 w-12 text-gray-400 mx-auto" />
            <p className="text-gray-500">
              {inputType === "image" 
                ? "Upload an image to extract prescription data" 
                : "Enter text or upload an image to get started"
              }
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getIntentIcon = (intentType: string) => {
    switch (intentType) {
      case "CREATE_ORDER":
      case "PARSE_VCA_TEXT":
      case "EXTRACT_PRESCRIPTION_FROM_IMAGE":
        return <Package className="h-5 w-5" />
      case "GET_ORDER_STATUS":
      case "GET_ORDER_LIST":
        return <Eye className="h-5 w-5" />
      case "CANCEL_ORDER":
        return <XCircle className="h-5 w-5" />
      case "GET_LENS_PRODUCTS":
      case "GET_COATING_PRODUCTS":
      case "GET_TINTING_PRODUCTS":
        return <Database className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getIntentColor = (intentType: string) => {
    switch (intentType) {
      case "CREATE_ORDER":
        return "bg-green-100 text-green-800"
      case "CANCEL_ORDER":
        return "bg-red-100 text-red-800"
      case "GET_ORDER_STATUS":
      case "GET_ORDER_LIST":
        return "bg-blue-100 text-blue-800"
      case "EXTRACT_PRESCRIPTION_FROM_IMAGE":
      case "PARSE_VCA_TEXT":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "N/A"
    if (typeof value === "boolean") return value ? "Yes" : "No"
    if (typeof value === "string" && value.includes("T") && value.includes("Z")) {
      return new Date(value).toLocaleString()
    }
    return String(value)
  }

  const downloadJSON = () => {
    const data = ediResult || parsedData
    const dataStr = JSON.stringify(data, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const downloadLink = document.createElement("a")
    downloadLink.setAttribute("href", dataUri)
    downloadLink.setAttribute("download", `${intent.toLowerCase()}-result.json`)
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  const renderVCAOrder = (data: any) => {
    if (!data.orderData) return null

    const order = data.orderData
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Order Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Customer:</span> {order.CLIENT}
            </div>
            {order.JOB && (
              <div>
                <span className="font-medium">Order ID:</span> {order.JOB}
              </div>
            )}
            <div>
              <span className="font-medium">Eyes:</span> 
              <Badge className="ml-2">
                {order.DO === "B" ? "Both" : order.DO === "R" ? "Right" : "Left"}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Shop Number:</span> {order.SHOPNUMBER || "N/A"}
            </div>
          </div>
        </div>

        {(order.SPH || order.CYL || order.AX || order.ADD) && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Prescription</h3>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="font-medium">Measurement</div>
              <div className="font-medium">Right Eye</div>
              <div className="font-medium">Left Eye</div>
              <div className="font-medium">Unit</div>
              
              {order.SPH && (
                <>
                  <div>Sphere (SPH)</div>
                  <div>{order.SPH.split(';')[0] || "N/A"}</div>
                  <div>{order.SPH.split(';')[1] || "N/A"}</div>
                  <div>D</div>
                </>
              )}
              
              {order.CYL && (
                <>
                  <div>Cylinder (CYL)</div>
                  <div>{order.CYL.split(';')[0] || "N/A"}</div>
                  <div>{order.CYL.split(';')[1] || "N/A"}</div>
                  <div>D</div>
                </>
              )}
              
              {order.AX && (
                <>
                  <div>Axis (AX)</div>
                  <div>{order.AX.split(';')[0] || "N/A"}°</div>
                  <div>{order.AX.split(';')[1] || "N/A"}°</div>
                  <div>degrees</div>
                </>
              )}
              
              {order.ADD && (
                <>
                  <div>Addition (ADD)</div>
                  <div>{order.ADD.split(';')[0] || "N/A"}</div>
                  <div>{order.ADD.split(';')[1] || "N/A"}</div>
                  <div>D</div>
                </>
              )}
            </div>
          </div>
        )}

        {(order.IPD || order.HBOX || order.VBOX) && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Frame & Measurements</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {order.IPD && (
                <div>
                  <span className="font-medium">PD:</span> {order.IPD}
                </div>
              )}
              {order.HBOX && (
                <div>
                  <span className="font-medium">Frame Width:</span> {order.HBOX}
                </div>
              )}
              {order.VBOX && (
                <div>
                  <span className="font-medium">Frame Height:</span> {order.VBOX}
                </div>
              )}
              {order.DBL && (
                <div>
                  <span className="font-medium">Bridge Size:</span> {order.DBL}
                </div>
              )}
            </div>
          </div>
        )}

        {(order.TINT || order.ACOAT || order.COLR) && (
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Lens Options</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {order.TINT && (
                <div>
                  <span className="font-medium">Tint:</span> {order.TINT}
                </div>
              )}
              {order.ACOAT && (
                <div>
                  <span className="font-medium">Coating:</span> {order.ACOAT}
                </div>
              )}
              {order.COLR && (
                <div>
                  <span className="font-medium">Color:</span> {order.COLR}
                </div>
              )}
              {order.LNAM && (
                <div>
                  <span className="font-medium">Lens Code:</span> {order.LNAM}
                </div>
              )}
            </div>
          </div>
        )}

        {data.confidence && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-sm font-medium">Extraction Confidence:</span>
            <Badge className={data.confidence > 0.8 ? "bg-green-100 text-green-800" : 
                             data.confidence > 0.6 ? "bg-yellow-100 text-yellow-800" : 
                             "bg-red-100 text-red-800"}>
              {Math.round(data.confidence * 100)}%
            </Badge>
          </div>
        )}
      </div>
    )
  }

  const renderEDIResult = (result: any) => {
    if (!result) return null

    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${result.Status === 0 ? "bg-green-50" : "bg-red-50"}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.Status === 0 ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className="font-semibold">
              {result.Status === 0 ? "Success" : "Error"}
            </span>
          </div>
          <p className="text-sm">{result.Message}</p>
        </div>

        {result.Data && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Result Data</h3>
            {Array.isArray(result.Data) ? (
              <div className="space-y-2">
                {result.Data.map((item: any, index: number) => (
                  <div key={index} className="bg-white p-3 rounded border text-sm">
                    {Object.entries(item).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-600">{key}:</span>
                        <span className="text-right">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-3 rounded border text-sm">
                {Object.entries(result.Data).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-600">{key}:</span>
                    <span className="text-right">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderGeneralResponse = (response: any) => {
    if (!response.response) return null

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm">{response.response}</p>
        </div>

        {response.suggestedActions && response.suggestedActions.length > 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Suggested Actions:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {response.suggestedActions.map((action: string, index: number) => (
                <li key={index}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getIntentIcon(intent)}
            <span>Processing Result</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getIntentColor(intent)}>
              {intent.replace(/_/g, " ")}
            </Badge>
            <Button variant="outline" size="sm" onClick={downloadJSON}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[calc(100vh-300px)]">
          <Tabs defaultValue="structured">
            <TabsList className="mb-4">
              <TabsTrigger value="structured">Structured View</TabsTrigger>
              <TabsTrigger value="raw">Raw Data</TabsTrigger>
              {ediResult && <TabsTrigger value="edi">EDI Response</TabsTrigger>}
            </TabsList>

            <TabsContent value="structured">
              {intent === "CREATE_ORDER" || intent === "PARSE_VCA_TEXT" || intent === "EXTRACT_PRESCRIPTION_FROM_IMAGE" ? (
                renderVCAOrder(parsedData)
              ) : intent === "GENERAL_INQUIRY" ? (
                renderGeneralResponse(parsedData)
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(parsedData, null, 2)}
                  </pre>
                </div>
              )}
            </TabsContent>

            <TabsContent value="raw">
              <div className="bg-gray-100 p-4 rounded-lg">
                <pre className="text-sm overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(parsedData, null, 2)}
                </pre>
              </div>
            </TabsContent>

            {ediResult && (
              <TabsContent value="edi">
                {renderEDIResult(ediResult)}
              </TabsContent>
            )}
          </Tabs>
        </ScrollArea>
      </CardContent>
    </Card>
  )
} 