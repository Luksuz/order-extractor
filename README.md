# RxOffice EDI Interface - Next.js Application

A comprehensive prescription order processing system that integrates with RxOffice EDI services via SOAP. This application allows users to upload prescription images, extract order data using AI, and submit orders directly to RxOffice systems.

## 🌟 Features

- **📸 Image Processing**: Upload prescription images (JPG, PNG, PDF)
- **🤖 AI Data Extraction**: Automatic prescription data extraction using GPT-4 Vision
- **📝 Editable Forms**: Comprehensive order form with all VCA fields
- **🔗 SOAP Integration**: Real-time integration with RxOffice EDI services
- **🔐 Custom Credentials**: User-configurable RxOffice authentication
- **📊 VCA Format Support**: Full Vision Council of America format compliance
- **🐛 Debug Tools**: Comprehensive debugging and logging interface
- **⚡ Real-time Processing**: Instant order validation and submission

## 🛠️ Prerequisites

Before setting up the application, ensure you have:

- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn** package manager
- **OpenAI API Key** (for GPT-4 Vision image processing)
- **RxOffice EDI Account** (username and password)
- **Git** (for cloning the repository)

## 📦 Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd whatsapp-order-extractor
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Using yarn
yarn install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Add the following environment variables to `.env.local`:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# RxOffice EDI Configuration (Optional - can be set via UI)
RXOFFICE_WSDL_URL=http://127.0.0.1:5000/CommonEDIService.svc?wsdl
RXOFFICE_USERNAME=your_rxoffice_username
RXOFFICE_PASSWORD=your_rxoffice_password

# SOAP Service Configuration
USE_REAL_SOAP_SERVICE=true

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 Running the Application

### 1. Start the Next.js Development Server

```bash
# Using npm
npm run dev

# Using yarn
yarn dev
```

The application will be available at `http://localhost:3000`

### 2. Start the RxOffice EDI SOAP Service (Required for real orders)

In a separate terminal, start the local SOAP service:

```bash
cd rxoffice-edi-service
./run.sh    # macOS/Linux
# or
run.bat     # Windows
```

The SOAP service will be available at `http://localhost:5000`

### 3. Verify Setup

1. Open `http://localhost:3000` in your browser
2. You should see the "RxOffice Image Extractor" interface
3. Check that both services are running:
   - Next.js app: `http://localhost:3000`
   - SOAP service: `http://localhost:5000/health`

## 📋 Usage Guide

### Step 1: Upload Prescription Image

1. Click "Select Image" to upload a prescription image
2. Supported formats: JPG, PNG, PDF
3. Click "Extract Data" to process the image with AI

### Step 2: Review Extracted Data

1. Review the automatically extracted prescription data
2. Edit any fields as needed
3. Fill in required fields:
   - **Order ID (JOB)**: Click "Generate" for auto-generated ID
   - **Customer Name (CLIENT)**: Enter patient name
   - **RxOffice Credentials**: Enter your username/password

### Step 3: Submit Order

1. Click "Submit Order" to send to RxOffice EDI
2. Monitor the submission process in console logs
3. View success confirmation and order details
4. Use the Debug modal for detailed information

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key for image processing | Yes | - |
| `RXOFFICE_WSDL_URL` | RxOffice SOAP service URL | No | `http://127.0.0.1:5000/CommonEDIService.svc?wsdl` |
| `RXOFFICE_USERNAME` | Default RxOffice username | No | `380` |
| `RXOFFICE_PASSWORD` | Default RxOffice password | No | `ZOHO123` |
| `USE_REAL_SOAP_SERVICE` | Enable real SOAP calls | No | `true` |

### RxOffice EDI Service Configuration

The local SOAP service can be configured in `rxoffice-edi-service/RxOfficeEDI/appsettings.json`:

```json
{
  "RxOfficeSettings": {
    "EnableVCAValidation": true,
    "MaxOrdersPerRequest": 1000,
    "DefaultOrderTimeout": 30
  }
}
```

## 📡 API Endpoints

### Next.js API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/extract-order` | POST | Extract order data from uploaded images |
| `/api/create-order-soap` | POST | Submit orders to RxOffice EDI via SOAP |
| `/api/create-order-soap` | GET | Test SOAP service connection |

### RxOffice SOAP Service

| Endpoint | Description |
|----------|-------------|
| `http://localhost:5000/CommonEDIService.svc` | Main SOAP endpoint |
| `http://localhost:5000/CommonEDIService.svc?wsdl` | WSDL definition |
| `http://localhost:5000/health` | Health check |

## 🏗️ Project Structure

```
whatsapp-order-extractor/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── create-order-soap/    # SOAP integration
│   │   └── extract-order/        # Image processing
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main application page
├── components/                   # React components
│   ├── ui/                       # UI components (Shadcn)
│   ├── image-extractor-form.tsx  # Main order form
│   └── debug-modal.tsx           # Debug information modal
├── lib/                          # Utility libraries
│   ├── vca-converter.ts          # VCA format conversion
│   └── utils.ts                  # General utilities
├── rxoffice-edi-service/         # Local SOAP service
│   ├── RxOfficeEDI/              # C# SOAP service
│   ├── run.sh                    # macOS/Linux startup
│   ├── run.bat                   # Windows startup
│   └── README.md                 # SOAP service documentation
├── .env.local                    # Environment variables
├── package.json                  # Node.js dependencies
└── README.md                     # This documentation
```

## 🔍 VCA Format Reference

The application generates VCA (Vision Council of America) format strings for RxOffice EDI:

```
DO=B;JOB=ORDER123;CLIENT=John Doe;SPH=-1.75;-1.75;CYL=-0.50;-0.50;AX=90;90;ADD=2.00;2.00;IPD=64;DBL=17
```

### Key VCA Fields

| Field | Description | Format | Example |
|-------|-------------|--------|---------|
| `DO` | Delivery option | B/U/F/S | `DO=B` |
| `JOB` | Order ID | String | `JOB=ORDER123` |
| `CLIENT` | Customer name | String | `CLIENT=John Doe` |
| `SPH` | Sphere power | R;L | `SPH=-1.75;-1.75` |
| `CYL` | Cylinder power | R;L | `CYL=-0.50;-0.50` |
| `AX` | Axis | R;L | `AX=90;90` |
| `ADD` | Addition power | R;L | `ADD=2.00;2.00` |
| `IPD` | Interpupillary distance | Single or R;L | `IPD=64` |

## 🐛 Troubleshooting

### Common Issues

#### 1. SOAP Service Connection Failed

**Error**: `Cannot connect to SOAP service`

**Solutions**:
- Ensure RxOffice EDI service is running: `cd rxoffice-edi-service && ./run.sh`
- Check service health: `http://localhost:5000/health`
- Verify WSDL URL: `http://localhost:5000/CommonEDIService.svc?wsdl`

#### 2. Image Processing Errors

**Error**: `Failed to process image`

**Solutions**:
- Verify OpenAI API key in `.env.local`
- Check image format (JPG, PNG, PDF supported)
- Ensure image file size is reasonable (< 20MB)
- Check OpenAI API quota and billing

#### 3. Order Validation Errors

**Error**: `Order ID (JOB) is required` or `Customer name (CLIENT) is required`

**Solutions**:
- Ensure required fields are filled in the form
- Click "Generate" for automatic Order ID creation
- Enter customer name in the CLIENT field

#### 4. Authentication Errors

**Error**: `Authentication failed`

**Solutions**:
- Verify RxOffice username and password
- Check credentials in the form
- Ensure RxOffice account is active

### Debug Tools

#### Console Logging

Enable detailed logging by checking browser console (F12):
- Order data extraction process
- VCA string generation
- SOAP service communication
- Error details and stack traces

#### Debug Modal

Use the Debug button (🐛) to access:
- Complete order data
- Generated VCA string
- Full API responses
- Technical details and statistics

### Performance Tips

1. **Image Optimization**: Resize large images before upload
2. **API Limits**: Be aware of OpenAI API rate limits
3. **Local Development**: Use mock mode for testing without SOAP service
4. **Network**: Ensure stable internet connection for AI processing

## 🔄 Development Workflow

### Making Changes

1. **Frontend Changes**: Edit files in `app/`, `components/`, or `lib/`
2. **API Changes**: Modify files in `app/api/`
3. **SOAP Service**: Update files in `rxoffice-edi-service/`

### Testing

```bash
# Run Next.js in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Database

The application uses:
- **In-memory database** for the SOAP service (resets on restart)
- **No persistent storage** for the Next.js app
- **Production**: Configure SQL Server in SOAP service for persistence

## 📞 Support

### Getting Help

1. **Check Logs**: Browser console and terminal output
2. **Debug Modal**: Use the built-in debugging tools
3. **SOAP Service**: Check `rxoffice-edi-service/README.md`
4. **OpenAI Issues**: Verify API key and usage limits

### Common Resources

- [RxOffice EDI Documentation](rxoffice-edi-service/README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [VCA Format Specification](rxoffice-edi-service/QUICKSTART.md)

## 📝 License

This project is provided as a reference implementation for RxOffice EDI integration. Please ensure compliance with your licensing requirements.

---

**🎉 Your RxOffice EDI Interface is ready to use!**

Start by uploading a prescription image and watch the AI extract the data for submission to RxOffice systems. 