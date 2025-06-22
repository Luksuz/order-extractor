# 🚀 Quick Setup Guide - RxOffice EDI Interface

This guide will get you up and running with the RxOffice EDI Interface in under 10 minutes.

## ⚡ Quick Start

### 1. Prerequisites Check

Before starting, ensure you have:

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Check if Git is installed
git --version
```

### 2. Clone and Install

```bash
# Clone the repository
git clone <your-repository-url>
cd whatsapp-order-extractor

# Install dependencies
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Copy this content to .env.local
cat > .env.local << 'EOF'
# OpenAI Configuration (Required)
OPENAI_API_KEY=your_openai_api_key_here

# RxOffice EDI Configuration (Optional - can be set via UI)
RXOFFICE_WSDL_URL=http://127.0.0.1:5000/CommonEDIService.svc?wsdl
RXOFFICE_USERNAME=380
RXOFFICE_PASSWORD=ZOHO123

# SOAP Service Configuration
USE_REAL_SOAP_SERVICE=true

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

**⚠️ Important**: Replace `your_openai_api_key_here` with your actual OpenAI API key.

### 4. Start Services

#### Terminal 1 - Next.js App
```bash
npm run dev
```

#### Terminal 2 - RxOffice SOAP Service
```bash
cd rxoffice-edi-service
./run.sh    # macOS/Linux
# or
run.bat     # Windows
```

### 5. Verify Installation

1. **Next.js App**: Open `http://localhost:3000`
2. **SOAP Service**: Open `http://localhost:5000/health`

You should see:
- ✅ RxOffice Image Extractor interface at localhost:3000
- ✅ `{"Status": "Healthy"}` response at localhost:5000/health

## 🔑 Getting API Keys

### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key and add it to `.env.local`

### RxOffice EDI Credentials

Contact your RxOffice EDI provider or use the default test credentials:
- Username: `380`
- Password: `ZOHO123`

## 🧪 Test the Setup

### Test 1: Upload Image

1. Go to `http://localhost:3000`
2. Click "Select Image"
3. Upload a prescription image
4. Click "Extract Data"

### Test 2: Submit Order

1. Fill in required fields:
   - Order ID (click "Generate")
   - Customer Name
   - RxOffice credentials
2. Click "Submit Order"
3. Check for success message

### Test 3: Debug Information

1. Click the 🐛 Debug button
2. Review the generated VCA string
3. Check order details and API responses

## 🔧 Common Setup Issues

### Issue: OpenAI API Error

**Symptoms**: Image processing fails
**Solution**: 
```bash
# Check if API key is set correctly
echo $OPENAI_API_KEY
# Should show your API key (not empty)
```

### Issue: SOAP Service Won't Start

**Symptoms**: Port 5000 connection refused
**Solution**:
```bash
# Check if .NET is installed
dotnet --version

# Navigate to service directory
cd rxoffice-edi-service/RxOfficeEDI

# Try manual start
dotnet run
```

### Issue: Port Conflicts

**Symptoms**: Port already in use errors
**Solution**:
```bash
# For Next.js (change port)
npm run dev -- -p 3001

# For SOAP service (change in Program.cs)
dotnet run --urls="http://localhost:5001"
```

## 📱 Platform-Specific Setup

### macOS Setup

```bash
# Install Node.js via Homebrew
brew install node

# Install .NET SDK
brew install --cask dotnet

# Make run script executable
chmod +x rxoffice-edi-service/run.sh
```

### Windows Setup

```powershell
# Install Node.js from nodejs.org
# Install .NET SDK from microsoft.com/dotnet

# Run the services
npm run dev
# In another terminal:
cd rxoffice-edi-service
run.bat
```

### Linux Setup

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install .NET SDK
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y dotnet-sdk-6.0

# Make run script executable
chmod +x rxoffice-edi-service/run.sh
```

## 🎯 Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
RXOFFICE_WSDL_URL=https://your-rxoffice-server.com/CommonEDIService.svc?wsdl
USE_REAL_SOAP_SERVICE=true
```

### Build for Production

```bash
# Build Next.js app
npm run build

# Start production server
npm start

# Build SOAP service
cd rxoffice-edi-service/RxOfficeEDI
dotnet publish -c Release
```

## 📊 Performance Optimization

### Image Processing

- **Recommended image size**: < 5MB
- **Supported formats**: JPG, PNG, PDF
- **Optimal resolution**: 1920x1080 or lower

### API Rate Limits

- **OpenAI GPT-4 Vision**: Check your plan limits
- **SOAP Service**: No built-in rate limiting
- **Next.js**: Adjust timeout in API routes if needed

## 🎉 You're Ready!

Your RxOffice EDI Interface is now set up and ready to process prescription orders!

**Next Steps**:
1. Upload a test prescription image
2. Review the extracted data
3. Submit your first order
4. Explore the debug tools

**Need Help?** Check the main [README.md](README.md) for detailed documentation and troubleshooting. 