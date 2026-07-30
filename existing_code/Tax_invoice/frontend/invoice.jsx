import React, { useState, useEffect, useRef, useCallback } from "react";
import "../Styles/tailwind.css";
import {
  Search, Plus, X, Edit2, Trash2, Download, Eye, FileText,
  RefreshCw, ArrowLeft
} from "lucide-react";
import axios from "axios";
import html2pdf from "html2pdf.js";

import sigStamp from "../images/madhura_sig_stamp.png";

const API = "http://localhost:3000/api/madhura-invoice";
const CLIENT_API = "http://localhost:3000/api/client";

const SERVICE_TYPES = ["CRM", "WEBSITE", "DM", "POSTERS"];
const UOM_OPTIONS = ["Lumpsum", "Nos", "Units", "Pieces", "Sets", "Meters", "Kg", "Liters", "Hours"];

const emptyItem = (sl) => ({ sl_no: sl, description: "", uom: "Lumpsum", quantity: 1, total_amount: "" });

// ── Number-to-words ────────────────────────────────────────────────────────
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

const fmtNum = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "---";

const InvoicePreview = React.forwardRef(function InvoicePreview(
  { header, items, subtotal, cgst, sgst, grandTotal, advance, netPayable }, ref
) {
  const amtWords = numberToWords(Math.round(netPayable)).toUpperCase();
  const bankRows = [
    ["Account Name", "Madhura Technologies Private Limited"],
    ["Account Type", "Current Account"],
    ["Bank Name", "Axis Bank, Aruppukottai"],
    ["Account number", "925020029656189"],
    ["IFSC Code", "UTIB0002029"],
    ["GST Number", "33AAUCM1456H1Z9"],
  ];

  return (
    <div ref={ref} style={{
      fontFamily: "'Times New Roman', Times, serif",
      fontSize: "9.5pt",
      color: "#000",
      background: "#fff",
      maxWidth: "794px",
      margin: "0 auto",
      padding: "20px 24px 0",
      boxSizing: "border-box",
      border: "2px solid #002060",
      display: "flex",
      flexDirection: "column",
      minHeight: "1122px",
      position: "relative",
      justifyContent: "flex-start"
    }}>
      <div style={{ flexGrow: 1, paddingBottom: "110px" }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "10px", borderBottom: "3.5px solid #002060" }}>
          <img src="/favicon.ico.png" alt="Madhura" style={{ height: "60px", objectFit: "contain", mixBlendMode: "multiply" }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "#002060", fontSize: "8pt", lineHeight: "1.4", textAlign: "left" }}>
          <div style={{
            background: "#002060",
            color: "#fff",
            borderRadius: "50%",
            width: "22px",
            height: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "2px",
            flexShrink: 0
          }}>
            <span style={{ fontSize: "10pt" }}>📍</span>
          </div>
          <div>
            <strong style={{ fontSize: "8.5pt", textTransform: "uppercase", letterSpacing: "0.5px" }}>Corporate Office</strong><br />
            <span>18, 2nd Floor, Rangaswamy Road, Sukrawar Pettai,</span><br />
            <span>R.S. Puram, Coimbatore, Tamil Nadu 641002.</span>
          </div>
        </div>
      </div>

      {/* ── Tax Invoice Title ── */}
      <div style={{ textAlign: "center", fontSize: "17pt", fontWeight: "bold", color: "#002060", letterSpacing: "2px", padding: "12px 0 6px", textTransform: "uppercase" }}>
        TAX INVOICE
      </div>
      
      {/* ── Subtitle row ── */}
      <div style={{
        textAlign: "center",
        fontSize: "8.5pt",
        fontWeight: "bold",
        borderTop: "1.5px solid #000",
        borderBottom: "1.5px solid #000",
        padding: "3px 0",
        textTransform: "uppercase",
        letterSpacing: "1px",
        marginBottom: "14px"
      }}>
        TAX INVOICE
      </div>

      {/* ── Customer & Invoice Details Table ── */}
      <div style={{ display: "flex", border: "1.5px solid #000", marginBottom: "8px" }}>
        {/* Left Side: Client address info */}
        <div style={{ flex: "1.2", padding: "6px 10px", borderRight: "1.5px solid #000", fontSize: "9.5pt", lineHeight: "1.5" }}>
          <div style={{ fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>INVOICE TO :</div>
          <div style={{ fontWeight: "bold", fontSize: "10.5pt", marginBottom: "4px" }}>{header.client_company || header.client_name || "—"}</div>
          <div style={{ whiteSpace: "pre-line", color: "#111" }}>{header.client_address || ""}</div>
          {header.client_gstin && (
            <div style={{ marginTop: "4px" }}>
              <strong>GSTIN : </strong>{header.client_gstin}
            </div>
          )}
        </div>

        {/* Right Side: Split details (Service No, Invoice Details) */}
        <div style={{ flex: "1.5", display: "flex", padding: "6px 10px", fontSize: "9.5pt", lineHeight: "1.7" }}>
          {/* Middle sub-col */}
          <div style={{ flex: "1", paddingRight: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div><strong>Service No :</strong> {header.service_no}</div>
            <div><strong>Client Code:</strong> {header.client_code}</div>
          </div>
          {/* Right sub-col */}
          <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div><strong>INVOICE NO:</strong> {header.invoice_no}</div>
            <div><strong>BILL DATE:</strong> {fmtDate(header.bill_date)}</div>
            <div><strong>RUNNING BILL NO:</strong> {header.running_bill_no}</div>
          </div>
        </div>
      </div>

      {/* ── Items Table ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt", border: "1.5px solid #000", marginBottom: "0px" }}>
        <thead>
          <tr style={{ borderBottom: "1.5px solid #000" }}>
            <th style={{ width: "8%", borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center", fontWeight: "bold" }}>SL.NO</th>
            <th style={{ width: "42%", borderRight: "1.5px solid #000", padding: "5px 8px", textAlign: "center", fontWeight: "bold" }}>DESCRIPTION</th>
            <th style={{ width: "15%", borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center", fontWeight: "bold" }}>UOM</th>
            <th style={{ width: "12%", borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center", fontWeight: "bold" }}>QTY</th>
            <th style={{ width: "23%", padding: "5px 8px", textAlign: "center", fontWeight: "bold" }}>TOTAL AMOUNT IN INR</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #000" }}>
              <td style={{ borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center" }}>{it.sl_no}</td>
              <td style={{ borderRight: "1.5px solid #000", padding: "5px 8px", textAlign: "left" }}>{it.description}</td>
              <td style={{ borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center" }}>{it.uom || "Lumpsum"}</td>
              <td style={{ borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center" }}>{it.quantity}</td>
              <td style={{ padding: "5px 8px", textAlign: "center", fontWeight: "bold" }}>{fmtNum(it.total_amount)}/-</td>
            </tr>
          ))}
          {/* TOTAL (EXCLUSIVE OF TAX) */}
          <tr style={{ borderBottom: "1px solid #000", fontWeight: "bold" }}>
            <td style={{ borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center" }}></td>
            <td style={{ borderRight: "1.5px solid #000", padding: "5px 8px", textAlign: "left", textTransform: "uppercase" }}>TOTAL (EXCLUSIVE OF TAX)</td>
            <td style={{ borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center" }}></td>
            <td style={{ borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center" }}></td>
            <td style={{ padding: "5px 8px", textAlign: "center" }}>{fmtNum(subtotal)}/-</td>
          </tr>
          {/* CGST */}
          <tr style={{ borderBottom: "1px solid #000" }}>
            <td style={{ borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center" }}></td>
            <td style={{ borderRight: "1.5px solid #000", padding: "5px 8px", textAlign: "left", fontWeight: "bold" }}>CGST</td>
            <td style={{ borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center" }}></td>
            <td style={{ borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center" }}>9%</td>
            <td style={{ padding: "5px 8px", textAlign: "center", fontWeight: "bold" }}>{fmtNum(cgst)}/-</td>
          </tr>
          {/* SGST */}
          <tr style={{ borderBottom: "1px solid #000" }}>
            <td style={{ borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center" }}></td>
            <td style={{ borderRight: "1.5px solid #000", padding: "5px 8px", textAlign: "left", fontWeight: "bold" }}>SGST</td>
            <td style={{ borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center" }}></td>
            <td style={{ borderRight: "1.5px solid #000", padding: "5px 4px", textAlign: "center" }}>9%</td>
            <td style={{ padding: "5px 8px", textAlign: "center", fontWeight: "bold" }}>{fmtNum(sgst)}/-</td>
          </tr>
          
          {/* TOTAL ROW */}
          <tr style={{ borderBottom: "1.5px solid #000", fontWeight: "bold" }}>
            <td colSpan="4" style={{ borderRight: "1.5px solid #000", padding: "5px 12px", textAlign: "center", textTransform: "uppercase" }}>TOTAL (INCLUSIVE OF TAX)</td>
            <td style={{ padding: "5px 8px", textAlign: "center" }}>{fmtNum(grandTotal)}/-</td>
          </tr>

          {/* ADVANCE ROW */}
          <tr style={{ borderBottom: "1.5px solid #000", fontWeight: "bold" }}>
            <td colSpan="4" style={{ borderRight: "1.5px solid #000", padding: "5px 12px", textAlign: "center", textTransform: "uppercase" }}>ADVANCE AMOUNT RECEIVED</td>
            <td style={{ padding: "5px 8px", textAlign: "center" }}>{fmtNum(advance)}/-</td>
          </tr>

          {/* NET PAYABLE ROW */}
          <tr style={{ borderBottom: "1.5px solid #000", fontWeight: "bold" }}>
            <td colSpan="4" style={{ borderRight: "1.5px solid #000", padding: "5px 12px", textAlign: "center", textTransform: "uppercase" }}>NET PAYABLE AMOUNT</td>
            <td style={{ padding: "5px 8px", textAlign: "center" }}>{fmtNum(netPayable)}/-</td>
          </tr>

          {/* WORDS ROW */}
          <tr style={{ fontWeight: "bold" }}>
            <td colSpan="5" style={{ padding: "5px 12px", textAlign: "center", textTransform: "uppercase", fontSize: "9pt", letterSpacing: "0.5px" }}>
              {amtWords}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Bank Details & Signatory ── */}
      <div style={{ display: "flex", border: "1.5px solid #000", borderTop: "none", fontSize: "9.5pt" }}>
        {/* Left: Bank Info */}
        <div style={{ flex: "1.2", padding: "6px 10px", borderRight: "1.5px solid #000", lineHeight: "1.5" }}>
          {bankRows.map(([k, v]) => (
            <div key={k} style={{ marginBottom: "2px" }}>
              <strong>{k} : </strong>{v}
            </div>
          ))}
        </div>
        
        {/* Right: Signatory Seal & Signature */}
        <div style={{ flex: "1.5", padding: "6px 10px", display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "center", minHeight: "115px" }}>
          <div style={{ fontWeight: "bold" }}>For MADHURA TECHNOLOGIES PVT LTD</div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "2px 0", position: "relative" }}>
            {/* The signature and stamp is displayed here in large size, centered */}
            <img src={sigStamp} alt="Authorized Seal & Signature" style={{ height: "70px", objectFit: "contain", mixBlendMode: "multiply", transform: "scale(1.15)" }} />
          </div>
          <div style={{ fontWeight: "bold", borderTop: "1px solid #000", width: "160px", margin: "0 auto", paddingTop: "2px", textTransform: "uppercase", fontSize: "8.5pt" }}>
            Authorised Signatory
          </div>
        </div>
      </div>
      </div>

      {/* ── Registered Address (bottom left, positioned absolutely at bottom) ── */}
      <div style={{
        position: "absolute",
        bottom: "38px",
        left: "24px",
        right: "24px",
        padding: "6px 0 4px",
        fontSize: "10pt",
        color: "#002060",
        lineHeight: "1.4",
        textAlign: "left"
      }}>
        <strong style={{ fontSize: "10.5pt" }}>Registered address:</strong><br />
        <span>2/315, savaspuram, Aruppukottai,</span><br />
        <span>Virudhunagar, Tamilnadu - 626101</span>
      </div>

      {/* ── Bottom Accent Info Bar positioned absolutely at bottom edge ── */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        height: "38px",
        fontFamily: "'Times New Roman', Times, serif",
        fontWeight: "bold",
        fontSize: "10pt",
        boxSizing: "border-box"
      }}>
        {/* Phone Left Accent block (Dark blue) */}
        <div style={{
          background: "#002060",
          color: "#fff",
          width: "35%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          clipPath: "polygon(0 0, 92% 0, 100% 100%, 0% 100%)",
          paddingRight: "15px"
        }}>
          <span style={{ marginRight: "6px", fontSize: "11pt" }}>📞</span> +91 90036 63660
        </div>
        {/* Info Right Accent block (Yellow/Orange) */}
        <div style={{
          background: "#f9b233",
          color: "#000",
          width: "65%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          paddingLeft: "10px"
        }}>
          <span>🌐 www.madhuratech.com</span>
          <span>✉ biz@madhuratech.com</span>
        </div>
      </div>
    </div>
  );
});

// ── Main Invoice Page ──────────────────────────────────────────────────────
const InvoicePage = () => {
  // List
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Double-click preview (like proposals)
  const [viewId, setViewId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [viewData, setViewData] = useState(null); // { header, items }
  const previewRef = useRef(null);

  // Create/Edit modal
  const [open, setOpen] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [postSavePreview, setPostSavePreview] = useState(false);
  const postSaveRef = useRef(null);

  // Client search
  const [clientSearch, setClientSearch] = useState("");
  const [clientList, setClientList] = useState([]);
  const [showClientDrop, setShowClientDrop] = useState(false);

  // Service type
  const [serviceType, setServiceType] = useState("CRM");

  // Form header
  const emptyHeader = () => ({
    client_id: null, client_name: "", client_company: "",
    client_address: "", client_gstin: "", service_no: "",
    client_code: "", invoice_no: "", running_bill_no: "",
    bill_date: new Date().toISOString().slice(0, 10), advance_amount: "",
  });
  const [header, setHeader] = useState(emptyHeader());
  const [items, setItems] = useState([emptyItem(1)]);

  const calcTotals = (itms, adv) => {
    const subtotal = itms.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const cgst = parseFloat((subtotal * 0.09).toFixed(2));
    const sgst = parseFloat((subtotal * 0.09).toFixed(2));
    const grandTotal = parseFloat((subtotal + cgst + sgst).toFixed(2));
    const advance = Number(adv || 0);
    const netPayable = grandTotal;
    return { subtotal, cgst, sgst, grandTotal, advance, netPayable };
  };
  const totals = calcTotals(items, header.advance_amount);

  // ── Fetch all invoices ──
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API);
      setInvoices(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchInvoices(); }, []);

  // ── Fetch autogenerated next details ──
  const fetchNextDetails = useCallback(async (cid, stype) => {
    try {
      const res = await axios.get(`${API}/next-details`, {
        params: { clientId: cid || undefined, serviceType: stype || "CRM" }
      });
      setHeader(prev => ({
        ...prev,
        invoice_no: res.data.invoice_no,
        service_no: res.data.service_no,
        client_code: res.data.client_code || prev.client_code,
        running_bill_no: res.data.running_bill_no,
        bill_date: res.data.bill_date,
      }));
    } catch (err) { console.error("Next details error:", err); }
  }, []);

  // ── Client search ──
  const searchClient = async (val) => {
    setClientSearch(val);
    if (!val.trim()) { setClientList([]); setShowClientDrop(false); return; }
    try {
      const res = await axios.get(`${CLIENT_API}/search?name=${encodeURIComponent(val)}`);
      setClientList(res.data); setShowClientDrop(true);
    } catch { setClientList([]); }
  };

  const selectClient = async (client) => {
    setClientSearch(client.company_name || client.name);
    setClientList([]); setShowClientDrop(false);
    const parts = [client.address, client.state, client.pincode ? `- ${client.pincode}` : null].filter(Boolean);
    setHeader(prev => ({
      ...prev, client_id: client.id, client_name: client.name || "",
      client_company: client.company_name || "", client_address: parts.join(", "), client_gstin: client.gstin || "",
    }));
    await fetchNextDetails(client.id, serviceType);
  };

  const handleServiceTypeChange = async (newType) => {
    setServiceType(newType);
    await fetchNextDetails(header.client_id, newType);
  };

  // ── Double-click: load & show preview (proposals pattern) ──
  const openPreview = async (inv) => {
    setViewId(inv.id);
    setSelectedId(inv.id);
    try {
      const res = await axios.get(`${API}/${inv.id}`);
      const rows = res.data;
      const h = rows[0];
      const loadedHeader = {
        client_id: h.client_id || null, client_name: h.client_name || "",
        client_company: h.client_company || "", client_address: h.client_address || "",
        client_gstin: h.client_gstin || "", service_no: h.service_no || "",
        client_code: h.client_code || "", invoice_no: h.invoice_no || "",
        running_bill_no: h.running_bill_no || "",
        bill_date: h.bill_date ? h.bill_date.slice(0, 10) : "",
        advance_amount: h.advance_amount || "",
      };
      const loadedItems = rows.filter(r => r.sl_no != null).map(r => ({
        sl_no: r.sl_no, description: r.description || "",
        uom: r.uom || "Lumpsum", quantity: r.quantity || 1,
        total_amount: r.total_amount || "",
      }));
      setViewData({ header: loadedHeader, items: loadedItems.length ? loadedItems : [emptyItem(1)] });
      setTimeout(() => setShowPreview(true), 50);
    } catch (err) { console.error("Preview load error:", err); }
  };

  const closePreview = () => {
    setShowPreview(false);
    setTimeout(() => { setViewId(null); setViewData(null); }, 400);
  };

  // ── Download PDF from preview ──
  const downloadPreviewPDF = () => {
    if (!previewRef.current || !viewData) return;
    html2pdf().from(previewRef.current).set({
      margin: 0,
      filename: `Madhura_Invoice_${viewData.header.invoice_no || viewId}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).save();
  };

  // ── Download PDF from post-save preview ──
  const downloadPostSavePDF = () => {
    if (!postSaveRef.current) return;
    html2pdf().from(postSaveRef.current).set({
      margin: 0,
      filename: `Madhura_Invoice_${header.invoice_no || savedId}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).save();
  };

  // ── Open new modal ──
  const openNew = async () => {
    setEditInvoiceId(null); setSavedId(null); setPostSavePreview(false);
    setClientSearch(""); setClientList([]); setShowClientDrop(false);
    setServiceType("CRM"); setItems([emptyItem(1)]);
    setHeader(emptyHeader());
    setOpen(true);
    await fetchNextDetails(null, "CRM");
  };

  // ── Open edit modal ──
  const openEdit = async (inv) => {
    setEditInvoiceId(inv.id); setSavedId(inv.id); setPostSavePreview(false);
    setClientSearch(inv.client_company || "");
    setServiceType("CRM"); setOpen(true);
    try {
      const res = await axios.get(`${API}/${inv.id}`);
      const rows = res.data; const h = rows[0];
      setHeader({
        client_id: h.client_id || null, client_name: h.client_name || "",
        client_company: h.client_company || "", client_address: h.client_address || "",
        client_gstin: h.client_gstin || "", service_no: h.service_no || "",
        client_code: h.client_code || "", invoice_no: h.invoice_no || "",
        running_bill_no: h.running_bill_no || "",
        bill_date: h.bill_date ? h.bill_date.slice(0, 10) : "",
        advance_amount: h.advance_amount || "",
      });
      const svMatch = (h.service_no || "").match(/MT\/([^/]+)\/INV/);
      if (svMatch) setServiceType(svMatch[1]);
      const loaded = rows.filter(r => r.sl_no != null).map(r => ({
        sl_no: r.sl_no, description: r.description || "",
        uom: r.uom || "Lumpsum", quantity: r.quantity || 1, total_amount: r.total_amount || "",
      }));
      setItems(loaded.length ? loaded : [emptyItem(1)]);
    } catch (err) { console.error("Edit load error:", err); }
  };

  const resetClose = () => {
    setOpen(false); setPostSavePreview(false); setEditInvoiceId(null); setSavedId(null);
    setClientSearch(""); setClientList([]); setShowClientDrop(false);
    setServiceType("CRM"); setItems([emptyItem(1)]); setHeader(emptyHeader());
  };

  const updateHeader = (field, value) => setHeader(prev => ({ ...prev, [field]: value }));
  const updateItem = (idx, field, value) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  const addItem = () => setItems(prev => [...prev, emptyItem(prev.length + 1)]);
  const removeItem = (idx) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sl_no: i + 1 })));
  };

  // ── Submit form ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!header.invoice_no.trim()) return alert("Invoice No is required");
    if (!header.bill_date) return alert("Bill Date is required");
    if (items.some(it => !it.description.trim())) return alert("All item descriptions are required");
    setSubmitting(true);
    try {
      const payload = { header, items };
      if (editInvoiceId || savedId) {
        await axios.put(`${API}/${editInvoiceId || savedId}`, payload);
        setSavedId(editInvoiceId || savedId);
      } else {
        const res = await axios.post(`${API}/create`, payload);
        setSavedId(res.data.invoiceId);
      }
      setPostSavePreview(true);
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await axios.delete(`${API}/${id}`);
      if (viewId === id) closePreview();
      fetchInvoices();
    } catch { alert("Delete failed"); }
  };

  const filtered = invoices.filter(inv =>
    (inv.client_company || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.invoice_no || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const INP = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1694CE] focus:ring-1 focus:ring-[#1694CE] transition bg-white";
  const INP_AUTO = "w-full border border-[#1694CE]/40 bg-blue-50/40 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1694CE] focus:ring-1 focus:ring-[#1694CE] transition font-medium text-[#0e6fa3]";

  // Totals for preview panel (viewData)
  const viewTotals = viewData ? calcTotals(viewData.items, viewData.header.advance_amount) : null;

  return (
    <div className="invoices-main-tab">

      {/* ── Page Header ── */}
      <div className="invoice-heading-tab flex gap-4 justify-between items-center mb-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-[#1694CE]">INVOICES</h2>
          <span className="text-sm text-gray-500">APP &gt; SALES &gt; INVOICE</span>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Download — active when a row is double-clicked */}
          <button
            onClick={viewId ? downloadPreviewPDF : undefined}
            title={viewId ? "Download Invoice PDF" : "Double-click a row to select invoice"}
            className={`w-10 h-10 border rounded-lg shadow-sm flex justify-center items-center transition ${viewId ? "bg-white hover:bg-[#1694CE] hover:text-white hover:border-[#1694CE] text-[#1694CE]" : "bg-gray-50 text-gray-300 cursor-not-allowed border-gray-200"}`}
          >
            <Download size={18} />
          </button>

          {/* Edit — active when a row is selected */}
          <button
            onClick={() => { if (selectedId) { const inv = invoices.find(i => i.id === selectedId); if (inv) openEdit(inv); } }}
            title={selectedId ? "Edit selected invoice" : "Click a row to select"}
            className={`w-10 h-10 border rounded-lg shadow-sm flex justify-center items-center transition ${selectedId ? "bg-white hover:bg-blue-50 text-blue-500 hover:border-blue-400" : "bg-gray-50 text-gray-300 cursor-not-allowed border-gray-200"}`}
          >
            <Edit2 size={17} />
          </button>

          {/* Delete — active when a row is selected */}
          <button
            onClick={() => { if (selectedId) handleDelete(selectedId); }}
            title={selectedId ? "Delete selected invoice" : "Click a row to select"}
            className={`w-10 h-10 border rounded-lg shadow-sm flex justify-center items-center transition ${selectedId ? "bg-white hover:bg-red-50 text-red-400 hover:border-red-400" : "bg-gray-50 text-gray-300 cursor-not-allowed border-gray-200"}`}
          >
            <Trash2 size={17} />
          </button>

          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm h-10">
            <Search size={15} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search company or invoice no..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="outline-none text-sm w-48 bg-transparent"
            />
          </div>

          <button
            onClick={openNew}
            className="bg-[#FF3355] hover:bg-[#e62848] text-white w-11 h-11 rounded-full flex justify-center items-center shadow-lg transition"
            title="New Invoice"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* ── Invoice List Table (hidden when previewing, like proposals) ── */}
      {!viewId && (
        <div className="bg-white shadow-md rounded-xl overflow-x-auto border border-gray-100">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] text-gray-600 uppercase text-xs border-b">
                <th className="px-4 py-3 text-center border-r">ID</th>
                <th className="px-4 py-3 text-left border-r">Invoice No</th>
                <th className="px-4 py-3 text-left border-r">Service No</th>
                <th className="px-4 py-3 text-left border-r">Client</th>
                <th className="px-4 py-3 text-left border-r">Bill Date</th>
                <th className="px-4 py-3 text-right border-r">Net Payable</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="py-10 text-center text-gray-400">Loading invoices...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="py-10 text-center text-gray-400">
                  <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                  No invoices found. Create your first invoice!
                </td></tr>
              ) : (
                filtered.map(inv => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id)}
                    onDoubleClick={() => openPreview(inv)}
                    title="Double-click to preview & download"
                    className={`border-b transition cursor-pointer ${selectedId === inv.id ? "bg-blue-50/60" : "hover:bg-gray-50/80"}`}
                  >
                    <td className="px-4 py-3 text-center font-mono text-xs text-gray-500 border-r">#{inv.id}</td>
                    <td className="px-4 py-3 font-semibold text-[#1694CE] border-r">{inv.invoice_no || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 border-r">{inv.service_no || "—"}</td>
                    <td className="px-4 py-3 font-medium border-r">{inv.client_company || inv.client_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 border-r">{fmtDate(inv.bill_date)}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700 border-r">₹{fmtNum(inv.net_payable)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={e => { e.stopPropagation(); openEdit(inv); }} title="Edit" className="text-blue-500 hover:text-blue-700 transition">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(inv.id); }} title="Delete" className="text-red-400 hover:text-red-600 transition">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-400 border-t bg-gray-50 rounded-b-xl">
              💡 <span className="font-medium">Double-click</span> any row to preview and download the invoice
            </div>
          )}
        </div>
      )}

      {/* ── Invoice Preview Panel (slides in on double-click, like proposals) ── */}
      {viewId && (
        <div
          key={viewId}
          className={`invoicewrapper w-full mt-4 bg-white shadow-xl rounded-xl p-6 relative overflow-y-auto ${showPreview ? "See" : ""}`}
        >
          {/* Preview action bar */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={closePreview}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-semibold transition"
              >
                <ArrowLeft size={16} /> Back to List
              </button>
              <div className="w-px h-5 bg-gray-300" />
              <span className="text-sm font-bold text-gray-700">
                {viewData?.header?.invoice_no || `Invoice #${viewId}`}
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {viewData?.header?.client_company || ""}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { const inv = invoices.find(i => i.id === viewId); if (inv) { closePreview(); setTimeout(() => openEdit(inv), 450); } }}
                className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition shadow-sm"
              >
                <Edit2 size={14} /> Edit
              </button>
              <button
                onClick={downloadPreviewPDF}
                className="flex items-center gap-1.5 bg-[#1694CE] hover:bg-[#1279a8] text-white px-5 py-2 rounded-lg text-sm font-bold transition shadow"
              >
                <Download size={14} /> Download PDF
              </button>
              <button
                onClick={closePreview}
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* The A4 invoice — this is what gets captured for PDF */}
          {viewData && viewTotals && (
            <div className="overflow-x-auto">
              <InvoicePreview
                ref={previewRef}
                header={viewData.header}
                items={viewData.items}
                subtotal={viewTotals.subtotal}
                cgst={viewTotals.cgst}
                sgst={viewTotals.sgst}
                grandTotal={viewTotals.grandTotal}
                advance={viewTotals.advance}
                netPayable={viewTotals.netPayable}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6 flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-7 py-5 border-b bg-gradient-to-r from-[#1694CE]/5 to-white rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-[#1694CE]">
                  {editInvoiceId ? "Edit Madhura Invoice" : "Create Madhura Invoice"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Blue fields are auto-generated — you can still edit them manually.</p>
              </div>
              <button onClick={resetClose} className="text-gray-400 hover:text-red-500 transition p-1 rounded-lg hover:bg-red-50">
                <X size={20} />
              </button>
            </div>

            <div className="p-7 overflow-y-auto flex-1">
              {!postSavePreview ? (
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Client Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-1 w-5 rounded bg-[#1694CE]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#1694CE]">Client Information</h3>
                      <div className="flex-1 h-px bg-blue-100" />
                    </div>
                    <div className="relative mb-4">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Search & Select Client</label>
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={clientSearch} onChange={e => searchClient(e.target.value)}
                          placeholder="Type client name or company..." autoComplete="off"
                          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[#1694CE] focus:ring-1 focus:ring-[#1694CE]" />
                      </div>
                      {showClientDrop && clientList.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {clientList.map((c, i) => (
                            <button key={i} type="button" onClick={() => selectClient(c)}
                              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b last:border-0 flex justify-between items-center">
                              <span className="font-medium">{c.company_name || c.name}</span>
                              <span className="text-xs text-gray-400">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Company Name</label>
                        <input type="text" value={header.client_company} onChange={e => updateHeader("client_company", e.target.value)} placeholder="e.g. Achme Communication" className={INP} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Contact Name</label>
                        <input type="text" value={header.client_name} onChange={e => updateHeader("client_name", e.target.value)} placeholder="e.g. Ravi Kumar" className={INP} />
                      </div>
                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Address</label>
                        <input type="text" value={header.client_address} onChange={e => updateHeader("client_address", e.target.value)} placeholder="e.g. 436 H Avinashi Road, Coimbatore, Tamil Nadu - 641004" className={INP} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">GSTIN</label>
                        <input type="text" value={header.client_gstin} onChange={e => updateHeader("client_gstin", e.target.value)} placeholder="e.g. 33AAHFA7876M1ZX" className={INP} />
                      </div>
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-1 w-5 rounded bg-[#1694CE]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#1694CE]">Invoice Details</h3>
                      <div className="flex-1 h-px bg-blue-100" />
                    </div>
                    <div className="mb-4 flex items-center gap-3 flex-wrap">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">Service Type</label>
                      <div className="flex gap-2 flex-wrap">
                        {SERVICE_TYPES.map(st => (
                          <button key={st} type="button" onClick={() => handleServiceTypeChange(st)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition border ${serviceType === st ? "bg-[#1694CE] text-white border-[#1694CE] shadow" : "bg-white text-gray-600 border-gray-300 hover:border-[#1694CE] hover:text-[#1694CE]"}`}>
                            {st}
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => fetchNextDetails(header.client_id, serviceType)}
                        className="ml-auto text-xs text-[#1694CE] hover:text-[#1279a8] flex items-center gap-1 font-semibold">
                        <RefreshCw size={12} /> Refresh
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Service No", field: "service_no", placeholder: `MT/${serviceType}/INV/0905`, auto: true },
                        { label: "Invoice No *", field: "invoice_no", placeholder: "MT/0107", auto: true, required: true },
                        { label: "Client Code", field: "client_code", placeholder: "MT021", auto: true },
                        { label: "Running Bill No", field: "running_bill_no", placeholder: "02", auto: true },
                      ].map(({ label, field, placeholder, auto, required }) => (
                        <div key={field} className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            {label} {auto && <span className="text-[#1694CE] font-normal normal-case">(auto)</span>}
                          </label>
                          <input type="text" value={header[field]} onChange={e => updateHeader(field, e.target.value)}
                            placeholder={placeholder} className={auto ? INP_AUTO : INP} required={required} />
                        </div>
                      ))}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Bill Date <span className="text-red-500">*</span></label>
                        <input type="date" value={header.bill_date} onChange={e => updateHeader("bill_date", e.target.value)} className={INP} required />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Advance Amount Received (INR)</label>
                        <input type="number" step="any" value={header.advance_amount} onChange={e => updateHeader("advance_amount", e.target.value)} placeholder="0.00" className={INP} />
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-5 rounded bg-[#1694CE]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1694CE]">Line Items</h3>
                      </div>
                      <button type="button" onClick={addItem}
                        className="bg-[#1694CE] hover:bg-[#1279a8] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm">
                        <Plus size={13} /> Add Item
                      </button>
                    </div>
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex gap-3 items-start">
                          <div className="w-8 text-center font-bold text-gray-400 mt-2 text-sm">#{item.sl_no}</div>
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="col-span-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Description <span className="text-red-500">*</span></label>
                              <input type="text" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Item description" className={INP} required />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">UOM</label>
                              <select value={item.uom} onChange={e => updateItem(idx, "uom", e.target.value)} className={INP}>
                                {UOM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Quantity</label>
                              <input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} min="1" className={INP} required />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Amount (INR) <span className="text-red-500">*</span></label>
                              <input type="number" step="any" value={item.total_amount} onChange={e => updateItem(idx, "total_amount", e.target.value)} placeholder="0.00" className={INP} required />
                            </div>
                          </div>
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 mt-6 p-1.5 rounded-lg hover:bg-red-50 transition">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Live totals */}
                    <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
                      {[["Subtotal", totals.subtotal], ["CGST 9%", totals.cgst], ["SGST 9%", totals.sgst]].map(([l, v]) => (
                        <div key={l} className="flex justify-between text-gray-600"><span>{l}</span><span className="font-semibold">₹{fmtNum(v)}</span></div>
                      ))}
                      <div className="flex justify-between font-bold text-gray-800 border-t pt-2"><span>Grand Total</span><span>₹{fmtNum(totals.grandTotal)}</span></div>
                      {totals.advance > 0 && <div className="flex justify-between text-gray-600"><span>Advance Received</span><span className="font-semibold">₹{fmtNum(totals.advance)}</span></div>}
                      <div className="flex justify-between font-extrabold text-[#1694CE] text-base border-t pt-2"><span>Net Payable</span><span>₹{fmtNum(totals.netPayable)}</span></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-end pt-2 border-t">
                    <button type="button" onClick={resetClose} className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-lg hover:bg-gray-200 transition font-semibold text-sm">Cancel</button>
                    <button type="submit" disabled={submitting}
                      className="bg-[#1694CE] hover:bg-[#1279a8] text-white px-8 py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-50 flex items-center gap-2 shadow">
                      {submitting ? "Saving..." : <><Eye size={15} /> Save & Preview</>}
                    </button>
                  </div>
                </form>
              ) : (
                /* Post-save preview inside modal */
                <div className="space-y-5">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-bold text-green-700">Invoice Saved Successfully!</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setPostSavePreview(false)}
                        className="bg-white border border-gray-300 text-gray-700 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-50 flex items-center gap-1.5 transition">
                        <Edit2 size={14} /> Edit Details
                      </button>
                      <button onClick={downloadPostSavePDF}
                        className="bg-[#1694CE] hover:bg-[#1279a8] text-white px-5 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition shadow">
                        <Download size={14} /> Download PDF
                      </button>
                    </div>
                  </div>
                  <div className="border rounded-xl shadow-inner bg-gray-100 p-4 overflow-x-auto">
                    <InvoicePreview
                      ref={postSaveRef}
                      header={header}
                      items={items}
                      subtotal={totals.subtotal}
                      cgst={totals.cgst}
                      sgst={totals.sgst}
                      grandTotal={totals.grandTotal}
                      advance={totals.advance}
                      netPayable={totals.netPayable}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicePage;
