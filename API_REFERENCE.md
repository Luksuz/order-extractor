# 🔌 API Reference - RxOffice Image Extractor

## Overview

This document provides comprehensive API documentation for the RxOffice Image Extractor application, including both frontend Next.js APIs and the backend SOAP service.

## 🌐 Frontend APIs

### Base URL
```
http://localhost:3000 (development)
https://your-domain.com (production)
```

---

## POST /api/extract-order

Processes uploaded prescription images using GPT-4 Vision to extract order data.

### Request

**Content-Type:** `multipart/form-data`

**Parameters:**
- `images` (File[]): Array of image files (max 5 files, 20MB each)

**Supported File Types:**
- `image/jpeg`
- `image/png` 
- `application/pdf`

### Response

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "DO": "B",
    "JOB": "ORD123456",
    "CLIENT": "John Doe",
    "SPH": "-1.75;-1.75",
    "CYL": "-0.50;-0.50",
    "AXIS": "90;90",
    "ADD": "2.00;2.00",
    "IPD": "64",
    "CLIENTF": "JD",
    "LNAM": "PROGRESSIVE;PROGRESSIVE",
    "ACOAT": "AR;AR",
    "HBOX": "52;52",
    "VBOX": "38;38",
    "DBL": "18",
    "SEGHT": "22;22"
  },
  "metadata": {
    "imagesProcessed": 2,
    "fileNames": ["prescription1.jpg", "prescription2.jpg"],
    "processingTime": 3.2,
    "aiModel": "gpt-4o"
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Failed to process images",
  "details": "OpenAI API error: insufficient quota"
}
```

### Example Usage

**JavaScript/Fetch:**
```javascript
const formData = new FormData()
formData.append('images', file1)
formData.append('images', file2)

const response = await fetch('/api/extract-order', {
  method: 'POST',
  body: formData
})

const result = await response.json()
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/extract-order \
  -F "images=@prescription1.jpg" \
  -F "images=@prescription2.jpg"
```

---

## POST /api/create-order-soap

Submits order data to RxOffice EDI system via SOAP protocol.

### Request

**Content-Type:** `application/json`

**Body:**
```json
{
  "orderData": {
    "DO": "B",
    "JOB": "ORD123456",
    "CLIENT": "John Doe",
    "SPH": "-1.75;-1.75",
    "CYL": "-0.50;-0.50",
    "AXIS": "90;90",
    "ADD": "2.00;2.00",
    "IPD": "64"
  },
  "credentials": {
    "userName": "380",
    "password": "ZOHO123"
  }
}
```

### Response

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "Id": "12345",
    "Reference": "ORD123456",
    "Status": "Created"
  },
  "message": "Order created successfully",
  "vca": "DO=B;JOB=ORD123456;CLIENT=John Doe;SPH=-1.75;-1.75;CYL=-0.50;-0.50;AXIS=90;90;ADD=2.00;2.00;IPD=64",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "Customer name (CLIENT) is required",
    "Order ID (JOB) is required"
  ],
  "message": "Please correct the validation errors and try again"
}
```

### Example Usage

**JavaScript/Fetch:**
```javascript
const response = await fetch('/api/create-order-soap', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderData: extractedData,
    credentials: {
      userName: '380',
      password: 'ZOHO123'
    }
  })
})

const result = await response.json()
```

---

## POST /api/match-customer

Matches customer names against a database for standardization.

### Request

**Content-Type:** `application/json`

**Body:**
```json
{
  "name": "John Smith"
}
```

### Response

**Success Response (200):**
```json
{
  "matched": true,
  "exactMatch": true,
  "code": "CUST001",
  "customer": {
    "name": "John Smith",
    "code": "CUST001",
    "city": "New York",
    "phone": "+1-555-0123"
  },
  "alternativeMatches": []
}
```

**Partial Match Response (200):**
```json
{
  "matched": true,
  "exactMatch": false,
  "code": "CUST002",
  "customer": {
    "name": "John Smithson",
    "code": "CUST002",
    "city": "Boston"
  },
  "alternativeMatches": [
    {
      "name": "Johnny Smith",
      "code": "CUST003",
      "city": "Chicago"
    }
  ]
}
```

---

## POST /api/match-lens-code

Matches lens codes against rx_code and stock_code database tables for standardization.

### Request

**Content-Type:** `application/json`

**Body:**
```json
{
  "code": "PROGRESSIVE"
}
```

### Response

**Success Response (200):**
```json
{
  "matched": true,
  "exactMatch": false,
  "code": "OVMDXV",
  "lensCode": {
    "retail_name": "OVMDXV Progressive",
    "retail_code": "OVMDXV",
    "source": "stock_code"
  },
  "alternativeMatches": [
    {
      "retail_name": "Progressive Standard",
      "retail_code": "PROG_STD",
      "source": "rx_code"
    },
    {
      "retail_name": "Progressive Premium",
      "retail_code": "PROG_PREM",
      "source": "rx_code"
    }
  ]
}
```

**No Match Response (200):**
```json
{
  "matched": false,
  "exactMatch": false,
  "code": null,
  "lensCode": null,
  "alternativeMatches": []
}
```

**Error Response (400):**
```json
{
  "error": "Lens code is required"
}
```

### Example Usage

**JavaScript/Fetch:**
```javascript
const response = await fetch('/api/match-lens-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: 'PROGRESSIVE'
  })
})

const result = await response.json()
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/match-lens-code \
  -H "Content-Type: application/json" \
  -d '{"code":"PROGRESSIVE"}'
```

### Database Schema

The lens code matching searches against two tables with identical schemas:

**rx_code table:**
```sql
create table public.rx_code (
  id bigint generated by default as identity not null,
  created_at timestamp with time zone not null default now(),
  retail_name text null,
  retail_code text null,
  constraint rx_code_pkey primary key (id)
);
```

**stock_code table:**
```sql
create table public.stock_code (
  id bigint generated by default as identity not null,
  created_at timestamp with time zone not null default now(),
  retail_name text null,
  retail_code text null,
  constraint stock_code_pkey primary key (id)
);
```

### Matching Algorithm

1. **Exact Match**: Searches for exact matches in both `retail_name` and `retail_code` fields
2. **Similarity Matching**: Uses character-based similarity algorithm for partial matches
3. **Threshold**: Only returns matches with >30% similarity
4. **Source Tracking**: Indicates whether match came from `rx_code` or `stock_code` table
5. **Best Match**: Returns highest similarity match as primary result
6. **Alternatives**: Provides up to 3 alternative matches for user review

---

## 🧼 SOAP Service APIs

### Base URL
```
http://localhost:5000/CommonEDIService.svc (development)
```

### WSDL
```
http://localhost:5000/CommonEDIService.svc?wsdl
```

---

## CreateOrder

Creates a new prescription order in the RxOffice system.

### SOAP Request

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tem="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tem:CreateOrder>
      <tem:userName>380</tem:userName>
      <tem:pwd>ZOHO123</tem:pwd>
      <tem:vca>DO=B;JOB=ORD123456;CLIENT=John Doe;SPH=-1.75;-1.75</tem:vca>
    </tem:CreateOrder>
  </soap:Body>
</soap:Envelope>
```

### SOAP Response

**Success:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CreateOrderResponse xmlns="http://tempuri.org/">
      <CreateOrderResult>
        <Status>0</Status>
        <Message>Order created successfully</Message>
        <Data>
          <Id>12345</Id>
          <Reference>ORD123456</Reference>
          <CustomerName>John Doe</CustomerName>
          <CreatedDate>2024-01-15T10:30:00Z</CreatedDate>
        </Data>
      </CreateOrderResult>
    </CreateOrderResponse>
  </soap:Body>
</soap:Envelope>
```

**Error:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CreateOrderResponse xmlns="http://tempuri.org/">
      <CreateOrderResult>
        <Status>1</Status>
        <Message>Validation failed</Message>
        <ValidationErrors>
          <string>Customer name (CLIENT) is required</string>
          <string>Order ID (JOB) is required</string>
        </ValidationErrors>
      </CreateOrderResult>
    </CreateOrderResponse>
  </soap:Body>
</soap:Envelope>
```

---

## GetOrderStatus

Retrieves the current status of an order.

### SOAP Request

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tem="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tem:GetOrderStatus>
      <tem:userName>380</tem:userName>
      <tem:pwd>ZOHO123</tem:pwd>
      <tem:orderId>12345</tem:orderId>
    </tem:GetOrderStatus>
  </soap:Body>
</soap:Envelope>
```

### SOAP Response

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetOrderStatusResponse xmlns="http://tempuri.org/">
      <GetOrderStatusResult>
        <Status>0</Status>
        <Message>Order status retrieved successfully</Message>
        <Data>
          <Id>12345</Id>
          <Reference>ORD123456</Reference>
          <Status>InProduction</Status>
          <StatusDescription>Order is currently in production</StatusDescription>
          <EstimatedCompletion>2024-01-20T15:00:00Z</EstimatedCompletion>
        </Data>
      </GetOrderStatusResult>
    </GetOrderStatusResponse>
  </soap:Body>
</soap:Envelope>
```

---

## GetOrderInfos

Retrieves order history and information.

### SOAP Request

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tem="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tem:GetOrderInfos>
      <tem:userName>380</tem:userName>
      <tem:pwd>ZOHO123</tem:pwd>
      <tem:startDate>2024-01-01T00:00:00Z</tem:startDate>
      <tem:endDate>2024-01-31T23:59:59Z</tem:endDate>
    </tem:GetOrderInfos>
  </soap:Body>
</soap:Envelope>
```

### SOAP Response

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetOrderInfosResponse xmlns="http://tempuri.org/">
      <GetOrderInfosResult>
        <Status>0</Status>
        <Message>Orders retrieved successfully</Message>
        <Data>
          <OrderInfo>
            <Id>12345</Id>
            <Reference>ORD123456</Reference>
            <CustomerName>John Doe</CustomerName>
            <CreatedDate>2024-01-15T10:30:00Z</CreatedDate>
            <Status>InProduction</Status>
          </OrderInfo>
          <OrderInfo>
            <Id>12346</Id>
            <Reference>ORD123457</Reference>
            <CustomerName>Jane Smith</CustomerName>
            <CreatedDate>2024-01-16T14:20:00Z</CreatedDate>
            <Status>Completed</Status>
          </OrderInfo>
        </Data>
      </GetOrderInfosResult>
    </GetOrderInfosResponse>
  </soap:Body>
</soap:Envelope>
```

---

## CancelOrder

Cancels an existing order.

### SOAP Request

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tem="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tem:CancelOrder>
      <tem:userName>380</tem:userName>
      <tem:pwd>ZOHO123</tem:pwd>
      <tem:orderId>12345</tem:orderId>
      <tem:reason>Customer requested cancellation</tem:reason>
    </tem:CancelOrder>
  </soap:Body>
</soap:Envelope>
```

### SOAP Response

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CancelOrderResponse xmlns="http://tempuri.org/">
      <CancelOrderResult>
        <Status>0</Status>
        <Message>Order cancelled successfully</Message>
        <Data>
          <Id>12345</Id>
          <Reference>ORD123456</Reference>
          <CancelledDate>2024-01-15T16:45:00Z</CancelledDate>
          <Reason>Customer requested cancellation</Reason>
        </Data>
      </CancelOrderResult>
    </CancelOrderResponse>
  </soap:Body>
</soap:Envelope>
```

---

## 📊 Product Catalog APIs

### GetLensProducts

Retrieves available lens products.

### GetCoatingProducts  

Retrieves available coating options.

### GetTintingProducts

Retrieves available tinting options.

### GetDesigns

Retrieves available lens designs.

---

## 🔧 Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid credentials |
| 413 | Payload Too Large - File size exceeded |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - SOAP service down |

### SOAP Status Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Validation Error |
| 2 | Authentication Failed |
| 3 | Order Not Found |
| 4 | Service Unavailable |
| 5 | Internal Error |

---

## 🔐 Authentication

### Frontend APIs
- No authentication required (internal APIs)
- OpenAI API key configured via environment variables

### SOAP Service
- Username/password authentication required
- Credentials passed in each SOAP request
- Test credentials: `userName=380`, `pwd=ZOHO123`

---

## 📝 VCA Format Specification

### Required Fields
- `DO` - Delivery Option (B=Both, U=Uncut, F=Finished, S=Semi-finished)
- `JOB` - Order reference/ID
- `CLIENT` - Customer name

### Optional Fields
- `SPH` - Sphere power (R;L format)
- `CYL` - Cylinder power (R;L format)  
- `AXIS` - Axis (R;L format)
- `ADD` - Addition power (R;L format)
- `IPD` - Interpupillary distance
- `LNAM` - Lens name/code (auto-matched against rx_code/stock_code tables)
- `ACOAT` - Anti-reflective coating
- `TINT` - Tint specification
- `HBOX` - Horizontal box measurement
- `VBOX` - Vertical box measurement
- `DBL` - Distance between lenses

### Format Rules
- Fields separated by semicolons (`;`)
- Bilateral values in R;L format (e.g., `-1.75;-1.75`)
- No spaces around equals signs or semicolons
- String values can contain spaces
- Numeric ranges: SPH (-20 to +20), CYL (-6 to +6), AXIS (0-180)

### Example VCA String
```
DO=B;JOB=ORD123456;CLIENT=John Doe;SPH=-1.75;-1.75;CYL=-0.50;-0.50;AXIS=90;90;ADD=2.00;2.00;IPD=64;LNAM=OVMDXV;OVMDXV;ACOAT=AR;AR
```

---

## 🧪 Testing

### Health Check Endpoints

**Frontend:**
```bash
curl http://localhost:3000/api/health
```

**SOAP Service:**
```bash
curl http://localhost:5000/health
```

### Sample Test Data

**Test VCA String:**
```
DO=B;JOB=TEST123;CLIENT=Test Customer;SPH=-2.00;-2.00;CYL=-0.75;-0.75;AXIS=90;90;ADD=2.25;2.25;IPD=64;LNAM=OVMDXV;OVMDXV
```

**Test Image Processing:**
```bash
curl -X POST http://localhost:3000/api/extract-order \
  -F "images=@test-prescription.jpg"
```

**Test Customer Matching:**
```bash
curl -X POST http://localhost:3000/api/match-customer \
  -H "Content-Type: application/json" \
  -d '{"name":"John Smith"}'
```

**Test Lens Code Matching:**
```bash
curl -X POST http://localhost:3000/api/match-lens-code \
  -H "Content-Type: application/json" \
  -d '{"code":"PROGRESSIVE"}'
```

**Test SOAP Integration:**
```bash
curl -X POST http://localhost:3000/api/create-order-soap \
  -H "Content-Type: application/json" \
  -d '{
    "orderData": {
      "DO": "B",
      "JOB": "TEST123",
      "CLIENT": "Test Customer"
    },
    "credentials": {
      "userName": "380",
      "password": "ZOHO123"
    }
  }'
```

---

## 📋 Rate Limits

### OpenAI API
- Depends on your OpenAI plan
- Monitor usage via OpenAI dashboard
- Implement retry logic for rate limit errors

### SOAP Service
- No rate limits in development
- Production limits depend on RxOffice configuration

---

This API reference provides comprehensive documentation for integrating with the RxOffice Image Extractor system. For additional support, refer to the troubleshooting section in the main documentation. 