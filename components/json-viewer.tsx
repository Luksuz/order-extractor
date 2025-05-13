"use client"

import { Card } from "@/components/ui/card"

interface JsonViewerProps {
  data: any
}

export default function JsonViewer({ data }: JsonViewerProps) {
  if (!data) return null

  // Function to render lens prescription data
  const renderPrescription = (eye: any, label: string) => {
    if (!eye) return null

    return (
      <div className="mb-2">
        <h4 className="font-medium text-sm">{label}</h4>
        <div className="grid grid-cols-4 gap-2 mt-1">
          <div className="bg-gray-100 p-2 rounded">
            <span className="text-xs text-gray-500">SPH</span>
            <p className="font-medium">{eye.SPH || "N/A"}</p>
          </div>
          <div className="bg-gray-100 p-2 rounded">
            <span className="text-xs text-gray-500">CYL</span>
            <p className="font-medium">{eye.CYL || "N/A"}</p>
          </div>
          <div className="bg-gray-100 p-2 rounded">
            <span className="text-xs text-gray-500">AXIS</span>
            <p className="font-medium">{eye.AXIS || "N/A"}</p>
          </div>
          <div className="bg-gray-100 p-2 rounded">
            <span className="text-xs text-gray-500">ADD</span>
            <p className="font-medium">{eye.ADD || "N/A"}</p>
          </div>
        </div>
      </div>
    )
  }

  // Function to render frame details
  const renderFrameDetails = (frame: any) => {
    if (!frame) return null

    return (
      <div className="grid grid-cols-3 gap-2 mt-1">
        <div className="bg-gray-100 p-2 rounded">
          <span className="text-xs text-gray-500">Size</span>
          <p className="font-medium">{frame.Size || "N/A"}</p>
        </div>
        <div className="bg-gray-100 p-2 rounded">
          <span className="text-xs text-gray-500">Height</span>
          <p className="font-medium">{frame.Height || "N/A"}</p>
        </div>
        <div className="bg-gray-100 p-2 rounded">
          <span className="text-xs text-gray-500">Type</span>
          <p className="font-medium">{frame.Type || "N/A"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">{data.CustomerName || "Unknown Customer"}</h3>
            <p className="text-sm text-gray-500">Ref: {data.ReferenceNumber || "N/A"}</p>
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {data.LensType || "Unknown Lens"}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Prescription Details</h3>
        {data.Prescription ? (
          <>
            {renderPrescription(data.Prescription.RightEye, "Right Eye")}
            {renderPrescription(data.Prescription.LeftEye, "Left Eye")}
            <div className="mt-2">
              <span className="text-sm text-gray-500">PD:</span>
              <span className="ml-2 font-medium">{data.PD || "N/A"}</span>
            </div>
          </>
        ) : (
          <p className="text-gray-500">No prescription data available</p>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Frame Details</h3>
        {data.FrameDetails ? (
          renderFrameDetails(data.FrameDetails)
        ) : (
          <p className="text-gray-500">No frame details available</p>
        )}
      </Card>

      {data.Remarks && (
        <Card className="p-4">
          <h3 className="font-semibold mb-1">Remarks</h3>
          <p className="text-gray-700">{data.Remarks}</p>
        </Card>
      )}
    </div>
  )
}
