# 🚀 Quick Reference Guide - RxOffice Image Extractor

## ⚡ Essential Commands

### Development Setup
```bash
# Clone and setup
git clone <repo-url>
cd whatsapp-order-extractor
npm install
cp .env.example .env.local

# Start development
npm run dev                    # Next.js app (http://localhost:3000)
cd rxoffice-edi-service && ./run.sh  # SOAP service (http://localhost:5000)
```

### Production Commands
```bash
npm run build                  # Build Next.js
npm start                      # Start production server
dotnet publish -c Release     # Build SOAP service
```

## 🔌 API Endpoints

### Frontend APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/extract-order` | POST | Process images with AI |
| `/api/create-order-soap` | POST | Submit order to RxOffice |
| `/api/match-customer` | POST | Match customer names |
| `/api/match-lens-code` | POST | Match lens codes from rx_code/stock_code tables |

### SOAP Service
| Operation | Purpose |
|-----------|---------|
| `CreateOrder` | Create new order |
| `GetOrderStatus` | Check order status |
| `GetOrderInfos` | Get order history |
| `CancelOrder` | Cancel existing order |

## 🔧 Environment Variables

### Required
```env
OPENAI_API_KEY=sk-...
```

### Optional
```env
RXOFFICE_WSDL_URL=http://localhost:5000/CommonEDIService.svc?wsdl
RXOFFICE_USERNAME=380
RXOFFICE_PASSWORD=ZOHO123
USE_REAL_SOAP_SERVICE=true
```

## 📋 VCA Field Reference

### Required Fields
- `DO` - Delivery Option (B/U/F/S)
- `JOB` - Order ID/Reference
- `CLIENT` - Customer Name

### Common Fields
- `SPH` - Sphere Power (R;L format)
- `CYL` - Cylinder Power (R;L format)
- `AXIS` - Axis (R;L format)
- `ADD` - Addition Power (R;L format)
- `IPD` - Interpupillary Distance
- `LNAM` - Lens Code (auto-matched against rx_code/stock_code tables)

### Format Examples
```
DO=B;JOB=ORD123456;CLIENT=John Doe;SPH=-1.75;-1.75;CYL=-0.50;-0.50;AXIS=90;90;LNAM=OVMDXV;OVMDXV
```

## 🐛 Quick Troubleshooting

### Image Processing Issues
```bash
# Check OpenAI API key
echo $OPENAI_API_KEY

# Test API quota
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/usage
```

### SOAP Service Issues
```bash
# Check service health
curl http://localhost:5000/health

# Verify WSDL
curl http://localhost:5000/CommonEDIService.svc?wsdl
```

### Common Error Solutions
| Error | Solution |
|-------|----------|
| "Failed to process images" | Check OpenAI API key and quota |
| "Cannot connect to SOAP service" | Ensure SOAP service is running |
| "CLIENT is required" | Fill in customer name field |
| "Too many images" | Limit to 5 images max |

## 📁 Key File Locations

### Frontend
- `app/page.tsx` - Main application page
- `components/image-extractor-form.tsx` - Order form with lens code matching
- `app/api/extract-order/route.ts` - Image processing
- `app/api/create-order-soap/route.ts` - SOAP integration
- `app/api/match-customer/route.ts` - Customer name matching
- `app/api/match-lens-code/route.ts` - Lens code matching

### SOAP Service
- `rxoffice-edi-service/RxOfficeEDI/Services/CommonEDIService.cs` - Main service
- `rxoffice-edi-service/RxOfficeEDI/Models/EDIModels.cs` - Data models
- `rxoffice-edi-service/RxOfficeEDI/Utils/VCAParser.cs` - VCA parsing

## 🧪 Testing Commands

```bash
# Test image processing
curl -X POST http://localhost:3000/api/extract-order -F "images=@test.jpg"

# Test customer matching
curl -X POST http://localhost:3000/api/match-customer \
  -H "Content-Type: application/json" \
  -d '{"name":"John Smith"}'

# Test lens code matching
curl -X POST http://localhost:3000/api/match-lens-code \
  -H "Content-Type: application/json" \
  -d '{"code":"OVMDXV"}'

# Test SOAP service
curl -X POST http://localhost:5000/CommonEDIService.svc \
  -H "Content-Type: text/xml" \
  -d @test-soap-request.xml

# Health checks
curl http://localhost:3000/api/health
curl http://localhost:5000/health
```

## 🔄 Development Workflow

1. **Start Services**: Run both Next.js and SOAP service
2. **Upload Images**: Use the web interface to upload prescription images
3. **Review Data**: Check extracted data in the form
4. **Auto-matching**: Customer names and lens codes are automatically matched
5. **Submit Order**: Test SOAP integration
6. **Debug**: Use browser console and network tab for troubleshooting

## 📦 Dependencies

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- Shadcn/UI
- OpenAI SDK
- SOAP client

### Backend
- .NET 8
- Entity Framework
- SoapCore
- Custom VCA parser

---

**💡 Pro Tips:**
- Use browser dev tools for debugging API calls
- Check console logs for detailed error information
- Test with clear, high-resolution prescription images
- Verify all required VCA fields before submission
- Keep SOAP service running during development
- Customer names and lens codes are automatically matched against database tables 