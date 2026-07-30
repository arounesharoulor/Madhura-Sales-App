# Signature and Seal Image Update

## Summary
Replaced the Madhura logo with the actual signature and seal image in the Tax Invoice preview template.

## Changes Made

### 1. File Management
- **Source**: `sign.png` (root directory)
- **Destination**: `frontend/assets/sign.png`
- **Action**: Copied signature image to frontend assets folder for proper React import

### 2. Code Updates

#### File: `frontend/screens/InvoiceScreen.web.jsx`

**Import Statement Added**:
```javascript
import signatureImage from "../assets/sign.png";
```

**Signature Section Updated**:
- **Location**: Inside the `InvoicePreview` component, in the "Bank & Signatory" section
- **Previous**: Used `madhuraLogo` with 45px height
- **Current**: Uses `signatureImage` with 60px height

**Updated Code**:
```javascript
<div style={{ flex: "1.5", padding: "6px 10px", display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "center", minHeight: "115px" }}>
  <div style={{ fontWeight: "bold" }}>For MADHURA TECHNOLOGIES PVT LTD</div>
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "4px 0" }}>
    <img src={signatureImage} alt="Authorized Seal & Signature" style={{ height: "60px", objectFit: "contain" }} />
  </div>
  <div style={{ fontWeight: "bold", borderTop: "1px solid #000", width: "160px", margin: "0 auto", paddingTop: "2px", textTransform: "uppercase", fontSize: "8.5pt" }}>
    Authorised Signatory
  </div>
</div>
```

## Visual Changes

### Before:
- Small Madhura logo (45px height)
- Simple branding element

### After:
- Actual signature and company seal (60px height)
- Professional signature with circular seal stamp
- Shows "For MADHURA TECHNOLOGIES PVT LTD" text above
- Shows "AUTHORISED SIGNATORY" text below with underline

## Image Details

The signature image (`sign.png`) contains:
1. Handwritten signature on the left
2. Circular company seal/stamp on the right
3. Blue ink color scheme matching the invoice design
4. Professional appearance suitable for official tax invoices

## Files Modified

1. ✅ `frontend/screens/InvoiceScreen.web.jsx` - Updated to use signature image
2. ✅ `frontend/assets/sign.png` - Added signature image to assets

## Testing

To verify the changes:
1. Open the Tax Invoice screen
2. Create or view any tax invoice
3. Click "Preview" or "Save & Preview"
4. Check the signature section at the bottom right
5. Verify the signature and seal image displays correctly
6. Download as PDF to ensure image quality

## Notes

- The signature image is now properly sized at 60px height (increased from 45px)
- Image maintains aspect ratio with `objectFit: "contain"`
- Works in both preview modal and PDF export
- No backend changes required
- Original madhura logo is still used in the header section
