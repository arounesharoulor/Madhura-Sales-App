# Quotation and Proforma Invoice Updates

## Overview
This document outlines the updates needed to align the Quotation and Proforma Invoice forms and templates with the new design specifications.

## Current vs New Design

### Current Implementation
- Complex forms with 50+ fields
- Multiple sections: client details, tax config, items, executive details, terms, payment, warranty
- Items table includes: description, brand/model, UOM, price, qty, discount
- Complex tax and terms management

### New Design Requirements

#### Quotation Form Structure:
1. **CLIENT DETAILS (TO ADDRESS)**
   - Search & Autocomplete client details
   - Company Name
   - Customer Name *
   - Mobile Number *
   - Email
   - Address Line 1
   - Address Line 2 (Optional)
   - City / District
   - State
   - PIN Code
   - Country (default: India)
   - Quotation Date *
   - Validity Period (e.g. 07-07-2026)

2. **TAX CONFIGURATION**
   - GST 18% (default)
   - GST 5%
   - Custom GST %

3. **QUOTE ITEMS**
   Table columns:
   - S.NO
   - HSN CODE
   - PRODUCT / DESCRIPTION *
   - UOM
   - QTY
   - RATE (₹)
   - GST %
   - TAX VALUE
   - AMOUNT (₹)
   
   - Add Line Item button
   - Live totals:
     - Subtotal (Exclusive)
     - CGST (9%)
     - SGST (9%)
     - Net Total

4. **EXECUTIVE DETAILS**
   - Executive Name
   - Contact Number
   - Email ID

5. **TERMS & CONDITIONS (5 EDITABLE ITEMS)**
   - Term 1
   - Term 2
   - Term 3
   - Term 4
   - Term 5

#### Proforma Invoice Form:
- Same as Quotation form
- **PLUS**: "Quick Fill from Quotation" dropdown at top

#### Template Output:
- Clean professional design with blue (#002060) headers
- Madhura logo top left
- "QUOTATION" or "PROFORMA INVOICE" title
- Two-column layout:
  - Left: BILL TO (client details)
  - Right: INVOICE DETAILS (Doc No, Date, Valid Until, State Code, Customer ID, Email)
- Items table with dark blue header
- Totals section on right
- Amount in words
- Terms & conditions section
- Signature with seal at bottom right

## Implementation Plan

### Phase 1: Create New Form Components
- [ ] Create `QuotationFormModal.jsx` with new simplified structure
- [ ] Create `ProformaInvoiceFormModal.jsx` extending quotation form
- [ ] Update item calculation logic for HSN code support
- [ ] Add tax value calculation column

### Phase 2: Update Templates
- [ ] Update `invoicetemplate.web.jsx` to match new blue-header design
- [ ] Add signature image (already done in tax invoice)
- [ ] Format amounts properly
- [ ] Add proper HSN column display

### Phase 3: Update Screens
- [ ] Update `QuotationScreen.web.jsx` to use new modal
- [ ] Update `ProformaInvoiceScreen.web.jsx` to use new modal
- [ ] Test autocomplete and quick-fill functionality

### Phase 4: Backend Verification
- [ ] Ensure HSN code field is saved properly
- [ ] Verify tax calculations match frontend
- [ ] Test terms_json storage

## Key Changes

### Data Structure
```javascript
// Item structure
{
  hsn_code: string,          // NEW
  description: string,       // was "name"
  uom: string,
  quantity: number,          // was "qty"
  price: number,            // was per-unit price
  tax: number,              // tax percentage
  discount: number,
  taxValue: number,         // NEW - calculated
  amount: number            // NEW - calculated with tax
}

// Terms structure
{
  terms_json: JSON.stringify([
    "Term 1 text",
    "Term 2 text",
    ...
  ])
}
```

### Calculation Logic
```javascript
// For each item:
itemSubtotal = (price * quantity) - discount
taxValue = itemSubtotal * (tax / 100)
itemAmount = itemSubtotal + taxValue

// Grand total:
subtotal = sum of all itemSubtotals
cgst = subtotal * (taxRate / 200)  // half of tax
sgst = subtotal * (taxRate / 200)  // half of tax
grandTotal = subtotal + cgst + sgst
```

## Files to Modify

1. ✅ `frontend/components/QuotationFormModal.jsx` - NEW
2. ✅ `frontend/components/ProformaInvoiceFormModal.jsx` - NEW
3. ✅ `frontend/components/invoicetemplate.web.jsx` - UPDATE
4. ✅ `frontend/screens/QuotationScreen.web.jsx` - UPDATE
5. ✅ `frontend/screens/ProformaInvoiceScreen.web.jsx` - UPDATE

## Testing Checklist

- [ ] Create new quotation with all fields
- [ ] Edit existing quotation
- [ ] Delete quotation
- [ ] View quotation preview/PDF
- [ ] Send quotation via email
- [ ] Create proforma invoice from scratch
- [ ] Quick-fill proforma invoice from quotation
- [ ] Edit existing proforma invoice
- [ ] View proforma invoice preview/PDF
- [ ] Verify HSN codes display correctly
- [ ] Verify tax calculations are accurate
- [ ] Verify terms display correctly
- [ ] Verify signature image appears
- [ ] Test in different browsers

## Notes

- The current implementation uses shared `InvoiceFormModal.jsx` which is too complex
- New simplified modals will be cleaner and more maintainable
- HSN Code support is critical for tax compliance
- Executive details section is optional but good to have
- Terms are now simple text array, not complex checkbox options
- Design matches professional invoice standards
