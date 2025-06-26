# WhatsApp Order Extractor - AI-Powered Prescription Processing

A modern Next.js application that uses AI to extract prescription data from images and integrates with RxOffice EDI services via SOAP. Upload prescription images, let AI extract the data, review and edit the information, then submit orders directly to RxOffice systems.

## 🌟 Key Features

- **🤖 AI-Powered Extraction**: Uses GPT-4 Vision to automatically extract prescription data from images
- **📸 Multi-Format Support**: Supports JPG, PNG, and PDF prescription images
- **🔍 Image Zoom**: 4x magnification zoom for detailed image inspection
- **📝 Smart Forms**: Intelligent form with database matching for customers, lens codes, tints, and coatings
- **🔗 SOAP Integration**: Real-time integration with RxOffice EDI services
- **📊 VCA Compliance**: Full Vision Council of America format support
- **🎯 Modern UI**: Clean, responsive interface with drag-and-drop upload

## 🛠️ Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** or **yarn** package manager
- **OpenAI API Key** (for GPT-4 Vision image processing)
- **RxOffice EDI Credentials** (username and password)

## 📦 Setup Instructions

### 1. Clone and Install

```bash
# Clone the repository
cd <project-name>

# Install dependencies
npm install
# or
yarn install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Copy the example environment file
cp .env.example .env.local
```

Add your configuration to `.env`:

```env
# Required: OpenAI API Key for image processing
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Default RxOffice credentials (can be set via UI)
RXOFFICE_USERNAME=your_username
RXOFFICE_PASSWORD=your_password

# Optional: SOAP service configuration
RXOFFICE_WSDL_URL=http://localhost:5000/CommonEDIService.svc?wsdl
USE_REAL_SOAP_SERVICE=true

# Optional: Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup (Optional, THIS IS ALREADY DONE)

If using database matching features, ensure your database is configured with:
- Customer database for smart customer matching
- Lens code database for lens code validation
- Tint and coating code databases

## 🚀 Running the Application

### Development Mode

```bash
# Start the development server
npm run dev
# or
yarn dev

# Application will be available at http://localhost:3000
```

### Production Build

```bash
# Build the application
npm run build
# or
yarn build

# Start the production server
npm start
# or
yarn start
```

### Build Verification

```bash
# Check build output
npm run build

# Test the production build locally
npm start

# Verify at http://localhost:3000
```

## 📡 API Endpoints

### 1. Extract Order Data from Image

**Endpoint**: `POST /api/extract-order`

**Description**: Processes uploaded prescription images using GPT-4 Vision to extract structured order data in VCA format.

**Parameters**:
- `image` (File, required): Prescription image file (JPG, PNG, or PDF)

**Request Example**:
```javascript
const formData = new FormData()
formData.append('image', imageFile)

const response = await fetch('/api/extract-order', {
  method: 'POST',
  body: formData
})
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "DO": "B",
    "JOB": "ORD123456",
    "CLIENT": "John Doe",
    "SHOPNUMBER": "ABC Optical",
    "SPH": "-1.75;-1.75",
    "CYL": "-0.50;-0.25",
    "AX": "90;180",
    "ADD": "2.00;2.00",
    "IPD": "32.0;32.0",
    "LNAM": "OVMDXV;OVMDXV",
    "TINT": "Gray",
    "ACOAT": "PT GREEN;PT GREEN"
  },
  "metadata": {
    "fileName": "prescription.jpg",
    "fileSize": 1024000
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "No image file provided"
}
```

### 2. Submit Order via SOAP

**Endpoint**: `POST /api/create-order-soap`

**Description**: Submits prescription orders to RxOffice EDI system via SOAP service.

**Parameters**:
```json
{
  "orderData": {
    "JOB": "string (required)",
    "CLIENT": "string (required)",
    "DO": "string (default: B)",
    "SPH": "string (R;L format)",
    "CYL": "string (R;L format)",
    "AX": "string (R;L format)",
    "ADD": "string (R;L format)",
    "IPD": "string (R;L format)",
    "NPD": "string (R;L format)",
    "HBOX": "string (R;L format)",
    "VBOX": "string (R;L format)",
    "DBL": "string (single value)",
    "FED": "string (R;L format)",
    "SEGHT": "string (R;L format)",
    "LNAM": "string (R;L format)",
    "TINT": "string",
    "ACOAT": "string (R;L format)",
    "ZTILT": "string (R;L format)",
    "MBASE": "string (R;L format)",
    "SHOPNUMBER": "string",
    "ShopNumber": "string"
  },
  "credentials": {
    "userName": "string (required)",
    "password": "string (required)"
  }
}
```

**Request Example**:
```javascript
const response = await fetch('/api/create-order-soap', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderData: {
      JOB: 'ORD123456',
      CLIENT: 'ABC Optical Store',
      DO: 'B',
      SPH: '-1.75;-1.75',
      CYL: '-0.50;-0.25',
      AX: '90;180',
      ADD: '2.00;2.00',
      IPD: '32.0;32.0'
    },
    credentials: {
      userName: '380',
      password: 'ZOHO123'
    }
  })
})
```

**Success Response**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "orderDetails": {
    "orderId": "ORD123456",
    "status": "submitted",
    "vcaString": "DO=B\nJOB=ORD123456\nCLIENT=ABC Optical Store\n..."
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Order ID (JOB) is required",
  "details": "Validation failed for required fields"
}
```

### 3. Test SOAP Connection

**Endpoint**: `GET /api/create-order-soap`

**Description**: Tests the connection to the RxOffice SOAP service.

**Parameters**: None

**Request Example**:
```javascript
const response = await fetch('/api/create-order-soap', {
  method: 'GET'
})
```

**Response**:
```json
{
  "status": "SOAP service connection test",
  "wsdlUrl": "http://localhost:5000/CommonEDIService.svc?wsdl",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Match Customer Names

**Endpoint**: `POST /api/match-customer`

**Description**: Searches the customer database for matching customer names and returns formatted results.

**Parameters**:
```json
{
  "name": "string (required, min 2 characters)"
}
```

**Request Example**:
```javascript
const response = await fetch('/api/match-customer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'ABC Optical'
  })
})
```

**Response**:
```json
{
  "matched": true,
  "exactMatch": false,
  "fuzzyMatch": true,
  "matchType": "fuzzy",
  "code": "ABC001",
  "customer": {
    "name": "ABC Optical Store",
    "city": "New York",
    "code": "ABC001"
  },
  "alternativeMatches": [
    {
      "name": "ABC Vision Center",
      "code": "ABC002",
      "city": "Boston"
    }
  ]
}
```

### 5. Match Lens Codes, Tints, and Coatings

**Endpoint**: `POST /api/match-lens-code`

**Description**: Universal endpoint for matching lens codes, tint codes, and coating codes against the database.

**Parameters**:
```json
{
  "code": "string (required, min 2 characters)"
}
```

**Request Example**:
```javascript
const response = await fetch('/api/match-lens-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: 'OVMDXV'
  })
})
```

**Response**:
```json
{
  "matched": true,
  "exactMatch": true,
  "code": "OVMDXV",
  "lensCode": {
    "code": "OVMDXV",
    "retail_name": "Varilux Comfort DRx",
    "description": "Progressive addition lens",
    "manufacturer": "Essilor"
  },
  "alternativeMatches": [
    {
      "code": "OVMDX",
      "retail_name": "Varilux Comfort",
      "description": "Standard progressive lens"
    }
  ]
}
```

## 🔧 VCA Format Reference

The application generates VCA (Vision Council of America) format strings with newline separation:

```
DO=B
JOB=ORD123456
CLIENT=ABC Optical Store
SHOPNUMBER=ABC001|ABC Optical Store
SPH=-1.75;-1.75
CYL=-0.50;-0.25
AX=90;180
ADD=2.00;2.00
IPD=32.0;32.0
NPD=30.0;30.0
HBOX=52.0;52.0
VBOX=38.0;38.0
DBL=18
FED=55.0;55.0
SEGHT=20.0;20.0
LNAM=OVMDXV;OVMDXV
TINT=Gray
ACOAT=PT GREEN;PT GREEN
ZTILT=8;8
MBASE=6.00;6.00
```

### Key VCA Fields

| Field | Description | Format | Example |
|-------|-------------|--------|---------|
| `DO` | Delivery option | B/U/F/S | `DO=B` |
| `JOB` | Order ID | String | `JOB=ORD123456` |
| `CLIENT` | Customer name | String | `CLIENT=ABC Optical` |
| `SHOPNUMBER` | Shop code/name | CODE\|Name or Name | `SHOPNUMBER=ABC001\|ABC Optical` |
| `SPH` | Sphere power | R;L | `SPH=-1.75;-1.75` |
| `CYL` | Cylinder power | R;L | `CYL=-0.50;-0.25` |
| `AX` | Axis | R;L | `AX=90;180` |
| `ADD` | Addition power | R;L | `ADD=2.00;2.00` |
| `IPD` | Interpupillary distance | R;L | `IPD=32.0;32.0` |
| `LNAM` | Lens code | R;L | `LNAM=OVMDXV;OVMDXV` |

## 🏗️ Project Structure

```
whatsapp-order-extractor/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── create-order-soap/    # SOAP integration endpoint
│   │   ├── extract-order/        # Image processing endpoint
│   │   ├── match-customer/       # Customer matching endpoint
│   │   └── match-lens-code/      # Lens/tint/coating matching
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Main application page
├── components/                   # React components
│   ├── ui/                       # Shadcn UI components
│   └── image-extractor-form.tsx  # Main order form component
├── lib/                          # Utility libraries
│   ├── vca-converter.ts          # VCA format conversion
│   └── utils.ts                  # General utilities
├── .env.local                    # Environment variables
├── package.json                  # Dependencies and scripts
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This documentation
```

## 🔍 Usage Workflow

### 1. Upload Image
- Drag and drop or select prescription image
- Supports JPG, PNG, PDF formats
- Image preview with 4x zoom functionality

### 2. AI Processing
- GPT-4 Vision analyzes the image
- Extracts prescription data automatically
- Populates form with structured data

### 3. Review and Edit
- Smart form with database matching
- Customer name auto-completion
- Lens code validation and syncing
- Tint and coating code matching

### 4. Submit Order
- Validates required fields
- Generates VCA format string
- Submits via SOAP to RxOffice EDI
- Provides success confirmation

## 🐛 Troubleshooting

### Common Issues

**OpenAI API Errors**
- Verify API key in `.env.local`
- Check API quota and billing status
- Ensure image size is under limits

**SOAP Service Connection**
- Verify SOAP service is running
- Check WSDL URL accessibility
- Validate RxOffice credentials

**Database Matching Issues**
- Ensure database endpoints are configured
- Check database connectivity
- Verify matching API responses

### Debug Tools

- Browser console for detailed logs
- Network tab for API request inspection
- Form validation error messages

## 📞 Support

For technical support:
1. Check browser console for errors
2. Verify all environment variables
3. Test API endpoints individually
4. Review network requests in DevTools

---

**🎉 Ready to process prescriptions with AI!**

Upload an image, let AI extract the data, review the results, and submit to RxOffice EDI systems. 