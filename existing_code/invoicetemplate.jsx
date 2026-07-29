//Shared invoice template (used by all three): invoicetemplate.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import sigStamp from "../images/madhura_sig_stamp.png";
import madhuraLogo from "../images/Madhura-logo.png";

// Company details for Madhura
const COMPANY_DETAILS = {
  name: "Madhura Technologies Pvt. Ltd.",
  gstin: "33AAUCM1456H1Z9",
  email: "biz@madhuratech.com",
  website: "www.madhuratech.com",
  phone: "+91 90036 63660",
  address: "18, 2nd Floor, Rangaswamy Road, Sukrawar Pettai, R.S. Puram, Coimbatore, Tamil Nadu 641002",
};

// ── Number-to-words helper ─────────────────────────────────────────────────
function numberToWords(num) {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function w(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + w(n % 100) : "");
    if (n < 100000) return w(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + w(n % 1000) : "");
    if (n < 10000000) return w(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + w(n % 100000) : "");
    return w(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + w(n % 10000000) : "");
  }
  const n = Math.round(Number(num) || 0);
  return n === 0 ? "Zero" : w(n);
}

// Accepts any of: performaInvoiceId, estimateInvoiceId, serviceEstimationId, quotationId
const Invoice = ({ performaInvoiceId, estimateInvoiceId, serviceEstimationId, quotationId }) => {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const getConfig = () => {
    if (performaInvoiceId) return { api: `/api/performainvoice/${performaInvoiceId}`, label: "PROFORMA INVOICE", prefix: "PI", dateField: "invoice_date", idField: "performainvoice_id" };
    if (estimateInvoiceId) return { api: `/api/estimate-invoice/${estimateInvoiceId}`, label: "ESTIMATION", prefix: "EI", dateField: "invoice_date", idField: "invoice_id" };
    if (serviceEstimationId) return { api: `/api/service-estimation/${serviceEstimationId}`, label: "SERVICE ESTIMATION", prefix: "SE", dateField: "invoice_date", idField: "invoice_id" };
    if (quotationId) return { api: `/api/quotations/${quotationId}`, label: "QUOTATION", prefix: "QT", dateField: "quotation_date", idField: "quotation_id" };
    return null;
  };

  const config = getConfig();

  useEffect(() => {
    if (!config) return;
    setError(null);
    axios.get(`http://localhost:3000${config.api}`).then(res => setRows(res.data)).catch(err => {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || "Failed to load invoice data");
    });
  }, [performaInvoiceId, estimateInvoiceId, serviceEstimationId, quotationId]); // eslint-disable-line

  if (error) return <p className="p-8 text-center text-red-500 font-medium text-lg">Error: {error}</p>;
  if (!rows.length || !config) return <p className="p-8 text-center text-gray-500 font-medium text-lg">Loading invoice data...</p>;

  const h = rows[0];
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "---";
  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Doc number
  const docDate = h[config.dateField] || h.invoice_date || h.quotation_date;
  const docId = h[config.idField] || h.id;
  const year = docDate ? new Date(docDate).getFullYear() : new Date().getFullYear();
  const docNumber = `${config.prefix}-${year}-${String(docId).padStart(3, "0")}`;

  // Tax rate from stored data
  const taxRate = h.tax_type === "GST5" ? 5 : h.tax_type === "CUSTOM" ? (Number(h.custom_tax) || 0) : 18;

  // Left side: client address from form fields
  const clientAddrParts = [h.client_address1, h.client_address2, h.client_city, h.client_state, h.client_pincode].filter(Boolean);

  // Check if this document uses the new Viridis style (PI or QT)
  const isQuoteOrPI = config.prefix === "PI" || config.prefix === "QT";

  if (isQuoteOrPI) {
    // Parse terms list
    let termsList = [];
    try {
      if (h.terms_json) {
        termsList = JSON.parse(h.terms_json);
      }
    } catch (e) {
      console.error("Error parsing terms_json:", e);
    }
    // Fallback to default 5 terms if empty
    if (!termsList || termsList.length === 0) {
      termsList = [
        "50% advance payment is required to initiate the project.",
        "Project confirmation will be made only after approval of the submitted proposal.",
        "Any additional requirements, modifications, or corrections beyond the agreed scope will be charged separately.",
        "The above-mentioned prices are exclusive of applicable taxes.",
        "GST @ 18% will be charged additionally as per government regulations."
      ];
    }

    const pageStyle = {
      fontFamily: "'Inter', 'Segoe UI', Roboto, -apple-system, sans-serif",
      color: "#1a1a1a",
      background: "#FFFFFF",
      width: "100%",
      maxWidth: "210mm",
      margin: "0 auto",
      padding: "0",
      boxSizing: "border-box",
      textAlign: "left",
      position: "relative",
      border: "2px solid #003366"
    };

    return (
      <div style={pageStyle}>
        {/* ── HEADER: Logo + Title ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 28px", background: "linear-gradient(135deg, #F8FAFB 0%, #E6EEF5 100%)", borderBottom: "3px solid #003366", boxShadow: "0 2px 4px rgba(0,51,102,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img src={madhuraLogo} alt="Madhura Technologies" style={{ height: "55px", width: "auto", objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }} />
          </div>
          <div style={{ color: "#003366", fontSize: "22pt", fontWeight: "900", letterSpacing: "3px", textTransform: "uppercase", textShadow: "0 1px 2px rgba(0,51,102,0.1)" }}>
            {config.label}
          </div>
        </div>
     

        {/* ── CORPORATE OFFICE ADDRESS ── */}
        <div style={{ padding: "16px 28px", borderBottom: "1px solid #D0DFEC", background: "#FAFBFC" }}>
          <div style={{ fontSize: "9pt", lineHeight: "1.7", color: "#2C3E50", textAlign: "center" }}>
            <strong style={{ fontSize: "10pt", color: "#003366", letterSpacing: "0.5px" }}>Corporate Office:</strong>{" "}
            {COMPANY_DETAILS.address}
            <br />
            <strong>Phone:</strong> {COMPANY_DETAILS.phone} | <strong>Email:</strong> {COMPANY_DETAILS.email} | <strong>GSTIN:</strong> {COMPANY_DETAILS.gstin}
          </div>
        </div>

        {/* ── CUSTOMER & DOC DETAILS TABLE ── */}
        <div style={{ display: "flex", border: "2px solid #D0DFEC", marginBottom: "10px", marginTop: "14px", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ flex: 1, borderRight: "2px solid #D0DFEC", background: "#FFFFFF" }}>
            <div style={{ background: "linear-gradient(135deg, #003366 0%, #004080 100%)", color: "#fff", padding: "8px 12px", fontSize: "9pt", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>Bill To</div>
            <div style={{ padding: "10px 10px", fontSize: "8.5pt", lineHeight: "1.6", color: "#333" }}>
              <div style={{ fontSize: "10pt", fontWeight: "700", color: "#0d0d0d", marginBottom: "4px" }}>{h.client_company || h.customer_name}</div>
              <div style={{ marginTop: "2px" }}>
                {clientAddrParts.join(", ")}
                {h.client_country && <>, {h.client_country}</>}
              </div>
              <div style={{ marginTop: "6px" }}><strong>Mobile:</strong> {h.mobile_number}</div>
              {h.client_gstin && <div style={{ marginTop: "2px" }}><strong>GSTIN:</strong> {h.client_gstin}</div>}
            </div>
          </div>
          <div style={{ width: "240px", minWidth: "240px", background: "#FFFFFF" }}>
            <div style={{ background: "linear-gradient(135deg, #003366 0%, #004080 100%)", color: "#fff", padding: "8px 12px", fontSize: "9pt", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>Invoice Details</div>
            <div style={{ padding: "10px 10px", fontSize: "8pt", lineHeight: "2", color: "#333" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><strong>Doc No:</strong> <span>{docNumber}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><strong>Date:</strong> <span>{formatDate(docDate)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><strong>Valid Until:</strong> <span>{h.validity || "07-07-2026"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><strong>State Code:</strong> <span>33</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e0e0e0", marginTop: "6px", paddingTop: "6px" }}><strong>Customer ID:</strong> <span>{h.client_code || `MT${String(h.customer_id || h.client_id || docId).padStart(3, "0")}`}</span></div>
              {h.email && <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}><strong>Email:</strong> <span style={{ fontSize: "7pt" }}>{h.email}</span></div>}
            </div>
          </div>
        </div>

        {/* ── ITEMS TABLE ── */}
        <div style={{ padding: "4px 28px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", margin: "12px 0 8px", border: "2px solid #D0DFEC", borderRadius: "4px", overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "linear-gradient(135deg, #003366 0%, #004080 100%)", color: "#fff" }}>
              <th style={{ padding: "10px 5px", width: "4%", textAlign: "center", fontSize: "8.5pt", fontWeight: "700", letterSpacing: "0.5px" }}>#</th>
              <th style={{ padding: "10px 5px", width: "8%", textAlign: "center", fontSize: "8.5pt", fontWeight: "700", letterSpacing: "0.5px" }}>HSN</th>
              <th style={{ padding: "10px 10px", textAlign: "left", fontSize: "8.5pt", fontWeight: "700", letterSpacing: "0.5px" }}>Description</th>
              <th style={{ padding: "10px 5px", width: "7%", textAlign: "center", fontSize: "8.5pt", fontWeight: "700", letterSpacing: "0.5px" }}>Qty</th>
              <th style={{ padding: "10px 5px", width: "10%", textAlign: "right", fontSize: "8.5pt", fontWeight: "700", letterSpacing: "0.5px" }}>Rate</th>
              <th style={{ padding: "10px 5px", width: "6%", textAlign: "center", fontSize: "8.5pt", fontWeight: "700", letterSpacing: "0.5px" }}>GST</th>
              <th style={{ padding: "10px 8px", width: "11%", textAlign: "right", fontSize: "8.5pt", fontWeight: "700", letterSpacing: "0.5px" }}>Tax Val</th>
              <th style={{ padding: "10px 10px", width: "16%", textAlign: "right", fontSize: "8.5pt", fontWeight: "700", letterSpacing: "0.5px" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => {
              const itemTax = Number(item.tax || taxRate || 18);
              const itemQty = Number(item.quantity || 1);
              const itemRate = Number(item.price || 0);
              const taxVal = itemQty * itemRate * (itemTax / 100);
              const itemAmt = itemQty * itemRate;

              return (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 5px", textAlign: "center", borderRight: "1px solid #f0f0f0", color: "#666" }}>{i + 1}</td>
                  <td style={{ padding: "8px 5px", textAlign: "center", borderRight: "1px solid #f0f0f0", color: "#555" }}>{item.hsn_code || "—"}</td>
                  <td style={{ padding: "8px 10px", textAlign: "left", borderRight: "1px solid #f0f0f0" }}>{item.description}</td>
                  <td style={{ padding: "8px 5px", textAlign: "center", borderRight: "1px solid #f0f0f0" }}>{itemQty} {item.uom || "Nos"}</td>
                  <td style={{ padding: "8px 5px", textAlign: "right", borderRight: "1px solid #f0f0f0" }}>{fmt(itemRate)}</td>
                  <td style={{ padding: "8px 5px", textAlign: "center", borderRight: "1px solid #f0f0f0" }}>{itemTax}%</td>
                  <td style={{ padding: "8px 8px", textAlign: "right", borderRight: "1px solid #f0f0f0" }}>{fmt(taxVal)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600" }}>{fmt(itemAmt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── TOTALS ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
          <div style={{ width: "46%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", borderBottom: "1px solid #eee", fontSize: "9pt" }}>
              <span style={{ color: "#555" }}>Sub Total</span><span style={{ fontWeight: "600" }}>{fmt(h.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", borderBottom: "1px solid #eee", fontSize: "9pt" }}>
              <span style={{ color: "#555" }}>CGST ({taxRate/2}%)</span><span style={{ fontWeight: "600" }}>{fmt(h.total_cgst)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", borderBottom: "1px solid #eee", fontSize: "9pt" }}>
              <span style={{ color: "#555" }}>SGST ({taxRate/2}%)</span><span style={{ fontWeight: "600" }}>{fmt(h.total_sgst)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "linear-gradient(135deg, #003366 0%, #004080 100%)", color: "#fff", fontSize: "11pt", fontWeight: "700", borderRadius: "4px" }}>
              <span style={{ fontWeight: "800" }}>Net Total</span><span style={{ fontWeight: "900", fontSize: "12pt" }}>₹ {fmt(h.grand_total)}</span>
            </div>
          </div>
        </div>

        {/* ── AMOUNT IN WORDS ── */}
        <div style={{ marginTop: "8px", fontSize: "9pt", color: "#444", fontStyle: "italic" }}>
          <strong>Amount in Words:</strong> {numberToWords(h.grand_total).toUpperCase()} ONLY
        </div>
        {h.delivery_schedule && (
          <div style={{ marginTop: "3px", fontSize: "9pt", color: "#444" }}>
            <strong>Delivery Schedule:</strong> {h.delivery_schedule}
          </div>
        )}
        </div>

        {/* ── TERMS ── */}
        <div style={{ margin: "8px 28px 0", borderTop: "1px solid #d0d8e0", paddingTop: "10px" }}>
          <div style={{ fontSize: "8.5pt", fontWeight: "700", color: "#003366", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Terms & Conditions</div>
          <ol style={{ paddingLeft: "18px", margin: "0 0 4px", fontSize: "8.5pt", lineHeight: "1.6", color: "#444" }}>
            {termsList.map((term, tIdx) => (
              <li key={tIdx} style={{ marginBottom: "2px" }}>{term}</li>
            ))}
          </ol>
        </div>

        {/* ── SIGNATORY ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 28px 16px", marginTop: "6px" }}>
          <div style={{ textAlign: "center", width: "200px" }}>
            <div style={{ fontSize: "8.5pt", color: "#666", marginBottom: "3px" }}>For {COMPANY_DETAILS.name}</div>
            <img src={sigStamp} alt="Seal" style={{ height: "60px", objectFit: "contain", mixBlendMode: "multiply" }} />
            <div style={{ borderTop: "1px solid #003366", fontWeight: "600", fontSize: "8.5pt", textTransform: "uppercase", paddingTop: "3px", color: "#003366", letterSpacing: "0.5px" }}>
              Authorised Signatory
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Keep original layout for Estimation / Service Estimation
  const termsLines = [];
  if (h.terms_general) termsLines.push("General Terms & Conditions apply.");
  if (h.terms_tax) termsLines.push("Prices quoted are exclusive of Sales and Service Tax (SEZ – NIL Tax applicable).");
  if (h.terms_project_period) termsLines.push(`Project Period: ${h.terms_project_period}`);
  if (h.terms_validity) termsLines.push("Quote valid for 15 days from the date of quotation.");
  try {
    const so = typeof h.terms_separate_orders === "string" ? JSON.parse(h.terms_separate_orders) : (h.terms_separate_orders || {});
    if (so.material) termsLines.push("A. Material Supply (As per actuals)");
    if (so.installation) termsLines.push("B. Installation / Services");
    if (so.usd) termsLines.push("C. Price may vary based on USD rates");
    if (so.boq) termsLines.push("D. Factory BOQ may vary");
  } catch (e) {}
  if (h.terms_payment) termsLines.push(`Payment Terms: ${h.terms_payment === "Custom" ? h.terms_payment_custom : h.terms_payment}`);
  if (h.terms_warranty) termsLines.push(`Warranty: ${h.terms_warranty}`);

  return (
    <center>
    <div className="flex justify-center items-start min-h-screen font-sans bg-gray-50 py-8 text-base">
      <div className="bg-[#FFFDF5] w-full max-w-[1100px] border border-[#93C5FD] overflow-hidden text-left shadow-lg relative rounded-lg" id="invoice-pdf-content" style={{boxShadow: "0 4px 20px rgba(59, 130, 246, 0.08)"}}>
        
        {/* Watermark */}
        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.03]" style={{ transform: "translate(-50%, -50%)", top: "50%", left: "50%", width: "80%", height: "80%" }}>
          <img src="/favicon.ico.png" alt="" className="w-full h-full object-contain" style={{ mixBlendMode: "multiply" }} />
        </div>
        <div className="relative z-10">
        
        {/* TOP ACCENT BAR */}

        {/* --- HEADER SECTION --- */}
        <div className="px-10 py-8 bg-white border-b border-gray-200">
          <div className="flex justify-between items-start gap-6">
            {/* Left: Logo & Details */}
            <div className="flex items-center gap-6">
               <img src="/favicon.ico.png" alt="Madhura Softwares" className="w-[200px] h-auto object-contain mix-blend-multiply" />
               <div className="text-sm text-gray-700 border-l-2 border-gray-300 pl-4 space-y-1">
                  <p><strong className="text-gray-900">GSTIN:</strong> {COMPANY_DETAILS.gstin}</p>
                  <p><strong className="text-gray-900">Email:</strong> {COMPANY_DETAILS.email}</p>
                  <p><strong className="text-gray-900">Website:</strong> {COMPANY_DETAILS.website}</p>
                  <p><strong className="text-gray-900">Ph:</strong> {COMPANY_DETAILS.phone}</p>
               </div>
            </div>
            
            {/* Right: Invoice Info */}
            <div className="text-right min-w-[280px]">
              <h1 className="text-3xl font-bold text-[#1694CE] tracking-wide uppercase mb-4">
                {config.label}
              </h1>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left shadow-sm">
                <table className="text-sm w-full text-gray-800">
                  <tbody>
                    <tr>
                      <td className="font-bold py-1.5 w-24">Doc No:</td>
                      <td className="font-semibold text-gray-900 text-right">{docNumber}</td>
                    </tr>
                    <tr>
                      <td className="font-bold py-1.5">Date:</td>
                      <td className="font-semibold text-gray-900 text-right">{formatDate(docDate)}</td>
                    </tr>
                    {h.reference_no && (
                      <tr className="border-t border-gray-200">
                        <td className="font-bold py-1.5 mt-1 block">Ref No:</td>
                        <td className="font-bold text-[#1694CE] text-right pt-1.5">{h.reference_no}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* --- ADDRESSES --- */}
        <div className="grid grid-cols-2 gap-0 border-b border-gray-200 bg-white">
          {/* FROM ADDRESS */}
          <div className="p-8 border-r border-gray-200">
            <h3 className="text-sm font-bold text-[#1694CE] uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">From Address</h3>
            <p className="font-extrabold text-gray-900 text-xl mb-2">{COMPANY_DETAILS.name}</p>
            {h.resolved_from_address || h.from_address_custom ? (
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{h.resolved_from_address || h.from_address_custom}</p>
            ) : (
              <p className="text-sm text-gray-800 leading-relaxed">Head Office, Main Branch</p>
            )}
            
            {(h.exec_name || h.exec_phone || h.exec_email) && (
              <div className="mt-5 pt-3 text-sm border-t border-gray-100 text-gray-700">
                <span className="font-bold text-gray-900 mr-2">Executive:</span>
                {h.exec_name && <span className="font-bold text-gray-800 mr-4">{h.exec_name}</span>}
                {h.exec_phone && <span className="mr-4">📞 {h.exec_phone}</span>}
                {h.exec_email && <span>✉ {h.exec_email}</span>}
              </div>
            )}
          </div>

          {/* TO ADDRESS */}
          <div className="p-8 bg-gray-50/50">
            <h3 className="text-sm font-bold text-[#1694CE] uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">TO</h3>
            {h.client_company && <p className="font-bold text-gray-900 text-xl mb-1">{h.client_company}</p>}
            <p className="font-bold text-gray-800 text-lg mb-2">{h.customer_name}</p>
            
            {clientAddrParts.length > 0 && <p className="text-sm text-gray-800 leading-relaxed">{clientAddrParts.join(", ")}</p>}
            {h.client_country && <p className="text-sm text-gray-800 leading-relaxed">{h.client_country}</p>}
            
            <div className="mt-3 text-sm text-gray-700 flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-gray-200/50">
              <span className="flex items-center gap-1.5 font-semibold">📞 {h.mobile_number}</span>
              {h.email && <span className="flex items-center gap-1.5 font-semibold">✉ {h.email}</span>}
            </div>
          </div>
        </div>

        {/* --- ITEMS TABLE --- */}
        <div className="px-10 py-8">
          <div className="border border-gray-300 rounded overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1694CE] text-white text-xs uppercase tracking-wider font-bold border-b border-[#1694CE]">
                  <th className="py-3 px-4 text-center w-12 border-r border-[#1580B8]">S.No</th>
                  <th className="py-3 px-4 border-r border-[#1580B8]">Description</th>
                  <th className="py-3 px-4 border-r border-[#1580B8] w-48">Brand / Model</th>
                  <th className="py-3 px-4 text-center w-20 border-r border-[#1580B8]">Qty</th>
                  <th className="py-3 px-4 text-center w-20 border-r border-[#1580B8]">UOM</th>
                  <th className="py-3 px-4 text-right w-32 border-r border-[#1580B8]">Price</th>
                  <th className="py-3 px-4 text-right w-36">Total</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-800">
                {rows.map((item, i) => (
                  <tr key={i} className="border-b border-gray-200 hover:bg-gray-50 last:border-0">
                    <td className="py-4 px-4 text-center text-gray-600 font-semibold border-r border-gray-200">{item.product_number ?? i + 1}</td>
                    <td className="py-4 px-4 border-r border-gray-200">
                      <div className="font-bold text-gray-900 text-base">
                        {(item.description || "").split(",").map((part, idx) => (
                          <div key={idx} className={idx > 0 ? "mt-1 text-gray-700 font-medium text-sm" : ""}>{part.trim()}</div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-700 text-sm border-r border-gray-200">{item.brand_model || "—"}</td>
                    <td className="py-4 px-4 text-center font-bold text-base border-r border-gray-200">{item.quantity}</td>
                    <td className="py-4 px-4 text-center text-gray-700 text-sm border-r border-gray-200">{item.uom || "Nos"}</td>
                    <td className="py-4 px-4 text-right font-semibold border-r border-gray-200 text-gray-800">₹{fmt(item.price)}</td>
                    <td className="py-4 px-4 text-right font-bold text-gray-900 text-base">₹{fmt(item.item_subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- TOTALS SUMMARY --- */}
        <div className="flex justify-end px-10 pb-8 border-b border-gray-200">
          <div className="w-1/2 min-w-[350px] max-w-[500px] bg-gray-50 rounded border border-gray-200 p-5 shadow-sm">
            <table className="w-full text-sm text-gray-800">
              <tbody>
                <tr>
                   <td className="py-1.5 font-medium">Subtotal</td>
                   <td className="py-1.5 text-right font-bold text-gray-900 text-base">₹{fmt(h.subtotal)}</td>
                </tr>
                {Number(h.total_discount) > 0 && (
                  <tr>
                     <td className="py-1.5 font-semibold text-red-600">Discount</td>
                     <td className="py-1.5 text-right font-bold text-red-600 text-base">-₹{fmt(h.total_discount)}</td>
                  </tr>
                )}
                <tr>
                   <td className="py-1.5 font-medium">CGST ({taxRate / 2}%)</td>
                   <td className="py-1.5 text-right font-bold text-gray-900 text-base">₹{fmt(h.total_cgst)}</td>
                </tr>
                <tr className="border-b border-gray-300">
                   <td className="py-1.5 pb-3 font-medium">SGST ({taxRate / 2}%)</td>
                   <td className="py-1.5 pb-3 text-right font-bold text-gray-900 text-base">₹{fmt(h.total_sgst)}</td>
                </tr>
                <tr>
                   <td className="py-3 pt-4 text-lg font-bold text-gray-900 uppercase tracking-wide">Grand Total</td>
                   <td className="py-3 pt-4 text-right text-2xl font-black text-[#1694CE]">₹{fmt(h.grand_total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* --- DYNAMIC TERMS (From the form checkboxes) --- */}
        {termsLines.length > 0 && (
          <div className="px-10 pt-8 pb-4 bg-white">
            <h4 className="text-base font-bold text-[#1694CE] uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">Terms & Conditions</h4>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-800 font-medium">
              {termsLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {/* --- FOOTER: BRANCHES, REGISTRATION DETAILS & NOTES --- */}
        <div className="border border-gray-300 mx-10 mb-12 rounded overflow-hidden shadow-sm bg-white">
           
           <div className="grid grid-cols-2">
              
              {/* Left Column: Registration Details & Default Content */}
              <div className="p-6 border-r border-gray-300 bg-gray-50/50">
                 <h4 className="text-sm font-bold text-[#1694CE] uppercase border-b border-gray-300 pb-2 mb-3">Order On</h4>
                 <p className="font-extrabold text-base text-gray-900 mb-1">{COMPANY_DETAILS.name}</p>
                 <p className="text-sm font-semibold text-gray-700 mb-4">Our Certificate of Provisional Registration</p>
                 
                 <table className="text-sm text-gray-800 w-full mb-6 mt-2">
                   <tbody>
                     <tr><td className="w-56 py-1 font-medium">GSTIN</td><td className="font-bold">423523GSDH</td></tr>
                     <tr><td className="py-1 font-medium">TIN NO</td><td className="font-bold">3747387199</td></tr>
                     <tr><td className="py-1 font-medium">SERVICE TAX REG. NO.</td><td className="font-bold">JSDND383JSDJJ</td></tr>
                     <tr><td className="py-1 font-medium">PAN</td><td className="font-bold">UEW3873</td></tr>
                     <tr><td className="py-1 font-medium">CENTRAL SALES TAX REG. NO.</td><td className="font-bold">88325</td></tr>
                   </tbody>
                 </table>

                 <h4 className="text-sm font-bold text-[#1694CE] uppercase border-b border-gray-300 pb-2 mb-3 mt-6">Notes</h4>
                 <div className="text-sm text-gray-800 space-y-4 leading-relaxed">
                    <div>
                       <span className="font-bold text-gray-900 block mb-1">Materials:</span>
                       <p>BOQ considered based on discussion and our previoues experience , however in case of any extra materials are required at time of execution will be charged extra .</p>
                       <p className="font-bold mt-1 uppercase text-gray-900">CABLE AND CABLE LAYING AND LAYING accessories AS PER ACTUALS</p>
                    </div>
                    <div>
                       <span className="font-bold text-gray-900 block mb-1">Delay:</span>
                       <p>In case of delay due to some dependencies from other agencies working at site , then Madhura Softwares will not be responsible for the same.</p>
                    </div>
                    <div>
                       <span className="font-bold text-gray-900 block mb-1">NOTE:</span>
                       <p>Civil Works, Electrical Works, and Interior Works are not included in our scope. Related vendors' presence is required during project execution.</p>
                    </div>
                 </div>
              </div>

              {/* Right Column: Branch Addresses, Bank & Signature */}
              <div className="p-6 flex flex-col justify-between bg-white">
                 <div>
                   <h4 className="text-sm font-bold text-[#1694CE] uppercase border-b border-gray-300 pb-2 mb-4">Our Branches</h4>
                   <div className="space-y-6 text-sm text-gray-800 leading-relaxed">
                      <div>
                        <p className="font-bold text-gray-900 text-base mb-1">Bangalore Branch:</p>
                        <p>14th Main Road, GK Layout, Electronic City Post</p>
                        <p>Bangalore - 560100</p>
                        <p className="mt-1">GSTIN: <span className="font-bold">2635GHHJG</span></p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-base mb-1">Chennai Branch:</p>
                        <p>5th Floor, 5CD PM Towers, Dreams Road, Thousand Lights</p>
                        <p>Chennai - 600006</p>
                        <p className="mt-1">GSTIN: <span className="font-bold">423523GSDH</span></p>
                      </div>
                   </div>

                   {/* Bank Details Table */}
                   <div className="mt-8">
                     <h4 className="text-sm font-bold text-[#1694CE] uppercase border-b border-gray-300 pb-2 mb-3">Bank Details</h4>
                     <table className="text-sm text-gray-800 w-full mb-2">
                       <tbody>
                         <tr><td className="w-36 py-1 font-medium">Company name</td><td className="font-bold text-gray-900">Madhura Softwares</td></tr>
                         <tr><td className="py-1 font-medium">Bank</td><td className="font-bold text-gray-900">KOTAK MAHINDRA BANK</td></tr>
                         <tr><td className="py-1 font-medium">Account no</td><td className="font-bold text-gray-900">12345667</td></tr>
                         <tr><td className="py-1 font-medium">IFSC Code</td><td className="font-bold text-gray-900">34DJFHJDH</td></tr>
                         <tr><td className="py-1 font-medium">Branch</td><td className="font-medium text-gray-800">test, coimbatore</td></tr>
                       </tbody>
                     </table>
                   </div>
                 </div>

                 {/* Signature Area */}
                 <div className="text-right mt-16 pt-6">
                    <p className="text-sm text-gray-600 italic font-medium mb-12 flex justify-end">For Madhura Softwares</p>
                    <div className="inline-block border-t border-gray-400 pt-3 text-center">
                        <p className="font-bold text-base text-gray-900 uppercase">Krishna Kumar M</p>
                        <p className="text-sm text-gray-700 font-bold tracking-wider mt-0.5">( 771234343 )</p>
                    </div>
                 </div>
              </div>

           </div>
        </div>
        </div>{/* /z-10 wrapper */}

      </div>
    </div>
    </center>
  );
};

export default Invoice;
