# Tax Invoice Form and Template Updates

## Summary
Updated the Tax Invoice form and preview template to match the provided design specifications. The form now follows a simpler, cleaner structure specifically tailored for Tax Invoices with auto-generated fields and a streamlined workflow.

## Changes Made

### 1. Frontend Components

#### New Component: `TaxInvoiceFormModal.jsx`
- **Location**: `frontend/components/TaxInvoiceFormModal.jsx`
- **Purpose**: Dedicated form modal for Tax Invoice creation/editing
- **Key Features**:
  - Client search and selection with dropdown
  - Company name and contact name fields
  - Address and GSTIN input
  - Service type buttons (CRM, WEBSITE, DM, POSTERS)
  - Auto-generated fields with blue highlighting:
    - Service No (auto)
    - Invoice No (auto) *
    - Client Code (auto)
    - Running Bill No (auto)
  - Bill Date picker
  - Advance Amount field
  - Line items with:
    - Description (required)
    - UOM dropdown (Lumpsum, Nos, Units, etc.)
    - Quantity
    - Total Amount (INR)
  - Live totals calculation:
    - Subtotal
    - CGST 9%
    - SGST 9%
    - Grand Total
    - Net Payable (after advance deduction)
  - Refresh button to regenerate auto fields
  - Save & Preview button

#### Updated Component: `InvoiceScreen.web.jsx`
- **Location**: `frontend/screens/InvoiceScreen.web.jsx`
- **Changes**:
  - Switched from `InvoiceFormModal` to `TaxInvoiceFormModal`
  - Removed complex form state (`extra`, `customer` objects)
  - Simplified item structure:
    - Old: `{ name, brand_model, price, qty, discount, uom }`
    - New: `{ description, uom, quantity, total_amount }`
  - Updated calculations to use `total_amount` directly instead of computing from price × qty
  - Removed unnecessary fields like tax configuration, terms, executive details
  - Fixed tax calculation: 9% CGST + 9% SGST = 18% total GST

### 2. Invoice Preview Template

#### Maintained Component: `InvoicePreview` (within InvoiceScreen.web.jsx)
- Retains the professional tax invoice template design
- Displays:
  - Madhura logo and corporate office address
  - "TAX INVOICE" title
  - Client information (Invoice To section)
  - Invoice details (Service No, Client Code, Invoice No, Bill Date, Running Bill No)
  - Line items table with columns:
    - SL.NO
    - DESCRIPTION
    - UOM
    - QTY
    - TOTAL AMOUNT IN INR
  - Totals section:
    - Total (Exclusive of Tax)
    - CGST 9%
    - SGST 9%
    - Total (Inclusive of Tax)
    - Advance Amount Received
    - Net Payable Amount
  - Amount in words
  - Bank details and authorized signatory
  - Registered address
  - Contact footer with phone, website, email

### 3. Data Structure Changes

#### Item Structure
```javascript
// Old structure
{
  sl_no: number,
  name: string,
  brand_model: string,
  price: number,
  qty: number,
  discount: number,
  uom: string
}

// New structure
{
  sl_no: number,
  description: string,
  uom: string,
  quantity: number,
  total_amount: number
}
```

#### Header Structure
```javascript
{
  client_id: string,
  client_name: string,
  client_company: string,
  client_address: string,
  client_gstin: string,
  service_no: string,        // Auto-generated: MT/CRM/INV/0906
  client_code: string,       // Auto-generated: MT021
  invoice_no: string,        // Auto-generated: MT/0109
  running_bill_no: string,   // Auto-generated: 01
  bill_date: date,
  advance_amount: number
}
```

### 4. Backend (No Changes Required)

The backend API already supports the data structure:
- `POST /madhura-invoice/create` - Creates new invoice
- `PUT /madhura-invoice/:id` - Updates existing invoice
- `GET /madhura-invoice` - Lists all invoices
- `GET /madhura-invoice/:id` - Gets single invoice
- `GET /madhura-invoice/next-details` - Gets auto-generated field values
- `DELETE /madhura-invoice/:id` - Deletes invoice

### 5. Form Workflow

1. **Open Form**: Click "New Invoice" button
2. **Select Client** (Optional):
   - Search and select from existing clients
   - Auto-fills: company name, contact name, address, GSTIN
3. **Or Enter Manually**:
   - Type company name, contact name, address, GSTIN
4. **Select Service Type**:
   - Choose CRM, WEBSITE, DM, or POSTERS
   - Auto-generates service number based on selection
5. **Auto-Generated Fields**:
   - Service No, Invoice No, Client Code, Running Bill No are pre-filled
   - Can be manually edited if needed
   - Click "Refresh" to regenerate
6. **Set Bill Date**: Required field
7. **Enter Line Items**:
   - Add description (required)
   - Select UOM
   - Enter quantity
   - Enter total amount for that item
8. **Enter Advance Amount** (Optional):
   - Deducted from grand total to show net payable
9. **Review Totals**:
   - Subtotal, CGST, SGST, Grand Total, Net Payable calculated automatically
10. **Save & Preview**:
    - Saves to database
    - Opens preview modal with formatted invoice
    - Option to download as PDF

## Key Improvements

1. **Simplified Form**: Removed 50+ unnecessary fields for tax invoices
2. **Auto-Generation**: Service No, Invoice No, Client Code, Running Bill No auto-generated
3. **Clear Visual Hierarchy**: Blue-highlighted auto fields, clear section headers
4. **Better UX**: Service type buttons instead of dropdown
5. **Live Calculations**: Totals update as you type
6. **Cleaner Data**: Direct total_amount input instead of price × quantity calculations
7. **Professional Preview**: Matches official tax invoice format
8. **PDF Export**: Direct download from preview

## Files Modified

1. `frontend/screens/InvoiceScreen.web.jsx` - Updated to use new form modal
2. `frontend/components/TaxInvoiceFormModal.jsx` - New dedicated form component

## Files Unchanged

1. `backend/controllers/madhuraInvoiceController.js` - No changes needed
2. `backend/models/TaxInvoice.js` - No changes needed
3. `backend/routes/madhuraInvoiceRoutes.js` - No changes needed

## Testing Checklist

- [ ] Create new tax invoice
- [ ] Search and select existing client
- [ ] Manually enter client information
- [ ] Test all service type buttons (CRM, WEBSITE, DM, POSTERS)
- [ ] Verify auto-generated field values
- [ ] Test refresh button
- [ ] Add multiple line items
- [ ] Enter advance amount
- [ ] Verify calculations (subtotal, CGST, SGST, grand total, net payable)
- [ ] Save invoice
- [ ] View preview
- [ ] Download PDF
- [ ] Edit existing invoice
- [ ] Delete invoice
- [ ] Search invoices in list
