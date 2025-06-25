// VCA (Vision Council of America) Format Converter
// Converts extracted order data to VCA string format for RxOffice EDI

export interface OrderData {
  // Basic Information
  DO?: string // Eyes (B, R, L)
  JOB?: string // Order ID
  CLIENT?: string // Customer name or code
  CLIENTF?: string // Name abbreviation
  SHOPNUMBER?: string // Shop number
  ShopNumber?: string // ERP Query number

  // Prescription Data
  SPH?: string // Sphere (R;L)
  CYL?: string // Cylinder (R;L)
  AX?: string // Axis (R;L)
  ADD?: string // Add power (R;L)
  PRVM?: string // Prescription prism (R;L)
  PRVA?: string // Prism base direction (R;L)
  PRVIN?: string // Horizontal prism direction (R;L)
  PRVUP?: string // Vertical prism direction (R;L)

  // Frame & Measurements
  IPD?: string // IPD Far (R;L)
  NPD?: string // Near PD (R;L)
  HBOX?: string // Frame width (R;L)
  VBOX?: string // Frame height (R;L)
  DBL?: string // Bridge width
  FED?: string // Frame effective diameter (R;L)
  SEGHT?: string // Segment height (R;L)
  BVD?: string // Back vertex distance (R;L)

  // Lens & Coating Options
  LNAM?: string // Lens code (R;L)
  CustomerRetailName?: string // Product name
  TINT?: string // Tint code
  ACOAT?: string // Coating code (R;L)
  COLR?: string // Color code (R;L)
  PANTO?: string // Pantoscopic tilt (R;L)

  // Advanced Technical Parameters
  CRIB?: string // Diameter 1 (R;L)
  ELLH?: string // Diameter 2 (R;L)
  MINTHKCD?: string // Min edge/center thickness (R;L)
  MINCTR?: string // Min center thickness (R;L)
  BCERIN?: string // Horizontal decentration (R;L)
  BCERUP?: string // Vertical decentration (R;L)
  ZTILT?: string // Face form tilt (R;L)
  MBASE?: string // Marked base curve (R;L)
}

export function convertToVCA(orderData: OrderData): string {
  console.log('🔄 === VCA CONVERSION START ===')
  console.log('📥 Input order data:', JSON.stringify(orderData, null, 2))
  
  const vcaFields: string[] = []

  // Helper function to add field - always include, even if empty
  const addField = (key: string, value?: string) => {
    const formattedValue = value?.trim() || '' // Use empty string if no value
    console.log(`✅ Adding VCA field: ${key}=${formattedValue}`)
    vcaFields.push(`${key}=${formattedValue}`)
  }

  // Basic Information - Required fields first
  addField('DO', orderData.DO || 'B') // Default to Both eyes
  addField('JOB', orderData.JOB)
  addField('CLIENT', orderData.CLIENT)
  
  // Optional basic fields
  addField('CLIENTF', orderData.CLIENTF)
  addField('SHOPNUMBER', orderData.SHOPNUMBER)
  addField('ShopNumber', orderData.ShopNumber)

  // Prescription Data - Core prescription fields
  addField('SPH', orderData.SPH)
  addField('CYL', orderData.CYL)
  addField('AX', orderData.AX)
  addField('ADD', orderData.ADD)
  
  // Prism fields
  addField('PRVM', orderData.PRVM)
  addField('PRVA', orderData.PRVA)
  addField('PRVIN', orderData.PRVIN)
  addField('PRVUP', orderData.PRVUP)

  // Frame & Measurements
  addField('IPD', orderData.IPD)
  addField('NPD', orderData.NPD)
  addField('HBOX', orderData.HBOX)
  addField('VBOX', orderData.VBOX)
  addField('DBL', orderData.DBL)
  addField('FED', orderData.FED)
  addField('SEGHT', orderData.SEGHT)
  addField('BVD', orderData.BVD)

  // Lens & Coating Options
  addField('LNAM', orderData.LNAM)
  addField('TINT', orderData.TINT)
  addField('ACOAT', orderData.ACOAT)
  addField('COLR', orderData.COLR)
  addField('PANTO', orderData.PANTO)
  
  // Product name (terminal sales)
  addField('CustomerRetailName', orderData.CustomerRetailName)

  // Advanced Technical Parameters
  addField('CRIB', orderData.CRIB)
  addField('ELLH', orderData.ELLH)
  addField('MINTHKCD', orderData.MINTHKCD)
  addField('MINCTR', orderData.MINCTR)
  addField('BCERIN', orderData.BCERIN)
  addField('BCERUP', orderData.BCERUP)
  addField('ZTILT', orderData.ZTILT)
  addField('MBASE', orderData.MBASE)

  // Join all fields with newlines instead of semicolons for better readability
  const vca = vcaFields.join('\n')
  
  console.log('📤 Generated VCA string (raw):', JSON.stringify(vca))
  console.log('📤 Generated VCA string (formatted):')
  console.log(vca)
  console.log('📤 VCA string length:', vca.length)
  console.log('📤 Number of lines:', vca.split('\n').length)
  console.log('🔄 === VCA CONVERSION END ===')
  
  return vca
}

export function validateOrderData(orderData: OrderData): { isValid: boolean; errors: string[] } {
  console.log('🔍 === VALIDATION START ===')
  console.log('📥 Validating order data:', JSON.stringify(orderData, null, 2))
  
  const errors: string[] = []

  // Required fields validation
  console.log('🔍 Checking JOB field:', orderData.JOB)
  if (!orderData.JOB || orderData.JOB.trim() === '') {
    console.log('❌ JOB field is missing or empty')
    errors.push('Order ID (JOB) is required')
  } else {
    console.log('✅ JOB field is valid:', orderData.JOB)
  }

  console.log('🔍 Checking CLIENT field:', orderData.CLIENT)
  if (!orderData.CLIENT || orderData.CLIENT.trim() === '') {
    console.log('❌ CLIENT field is missing or empty')
    errors.push('Customer name (CLIENT) is required')
  } else {
    console.log('✅ CLIENT field is valid:', orderData.CLIENT)
  }

  // Validate prescription data format (should be R;L format)
  const validateRLFormat = (field: string, value?: string) => {
    if (value && value.includes(';')) {
      const parts = value.split(';')
      if (parts.length !== 2) {
        console.log(`❌ ${field} format error: expected 2 parts, got ${parts.length}`)
        errors.push(`${field} should have exactly 2 values separated by semicolon (R;L format)`)
      } else {
        console.log(`✅ ${field} format is valid: ${value}`)
      }
    }
  }

  validateRLFormat('SPH', orderData.SPH)
  validateRLFormat('CYL', orderData.CYL)
  validateRLFormat('AX', orderData.AX)
  validateRLFormat('ADD', orderData.ADD)
  validateRLFormat('IPD', orderData.IPD)

  console.log('📊 Validation summary:')
  console.log('   - Errors found:', errors.length)
  console.log('   - Is valid:', errors.length === 0)
  console.log('   - Error list:', errors)
  console.log('🔍 === VALIDATION END ===')

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Example usage with smart matching system:
// If smart matching finds a code:
// const orderData = { JOB: 'ORD123', CLIENT: 'CUST001', SHOPNUMBER: 'MYA001|Myapecs Optical', SPH: '-1.75;-1.75', ... }
// If no match found:
// const orderData = { JOB: 'ORD123', CLIENT: 'CUST001', SHOPNUMBER: 'Unknown Shop', SPH: '-1.75;-1.75', ... }
// const vca = convertToVCA(orderData)
// console.log(vca) 
// Output (with match):
// DO=B
// JOB=ORD123
// CLIENT=CUST001
// SHOPNUMBER=MYA001|Myapecs Optical
// SPH=-1.75;-1.75
// ...
// Output (no match):
// DO=B
// JOB=ORD123
// CLIENT=CUST001
// SHOPNUMBER=Unknown Shop
// SPH=-1.75;-1.75
// ... 