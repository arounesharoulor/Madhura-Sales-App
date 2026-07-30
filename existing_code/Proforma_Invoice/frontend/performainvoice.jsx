import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Download, X, Edit2, MinusCircle, PlusCircle, Trash2, Mail } from "lucide-react";
import { calculateItemTotal, calculateTotals } from "../utils/invoicecal";
import axios from "axios";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "../Styles/tailwind.css";
import Invoice from "../components/invoicetemplate";

const CLIENT_API = "http://localhost:3000/api/client";

const defaultTerms = [
  "50% advance payment is required to initiate the project.",
  "Project confirmation will be made only after approval of the submitted proposal.",
  "Any additional requirements, modifications, or corrections beyond the agreed scope will be charged separately.",
  "The above-mentioned prices are exclusive of applicable taxes.",
  "GST @ 18% will be charged additionally as per government regulations."
];

const emptyExtra = () => ({
  client_company: "", client_address1: "", client_address2: "",
  client_city: "", client_state: "", client_pincode: "", client_country: "India", client_gstin: "",
  tax_type: "GST18", custom_tax: "",
  exec_name: "", exec_phone: "", exec_email: "",
  validity: "07-07-2026",
  terms_json: JSON.stringify(defaultTerms)
});

const PerformaInvoice = () => {
  const [performaInvoices, setPerformaInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [showinvoice, setShowInvoice] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mailOpen, setMailOpen] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailSending, setMailSending] = useState(false);
  // Client Search Autocomplete
  const [clientSearch, setClientSearch] = useState("");
  const [clientList, setClientList] = useState([]);
  const [showClientDrop, setShowClientDrop] = useState(false);

  // Form Fields
  const [items, setItems] = useState([{ hsn_code: "", name: "", brand_model: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 }]);
  const [customer, setCustomer] = useState({ customer_name: "", mobile_number: "", email: "", location_city: "" });
  const [performaInvoice, setPerformaInvoice] = useState({ invoice_date: new Date().toISOString().slice(0, 10) });
  const [extra, setExtra] = useState(emptyExtra());
  const [terms, setTerms] = useState(defaultTerms);

  const invoiceRef = useRef(null);

  const formatPINumber = (id, dateStr) => {
    const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
    return `PI-${year}-${String(id).padStart(3, "0")}`;
  };

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const imgW = canvas.width;
    const imgH = canvas.height;
    const ratio = Math.min(pdfW / imgW, pdfH / imgH);
    const w = imgW * ratio;
    const h = imgH * ratio;
    pdf.addImage(imgData, "JPEG", (pdfW - w) / 2, (pdfH - h) / 2, w, h);
    pdf.save(`Performa_Invoice_${viewId}.pdf`);
  };

  useEffect(() => {
    fetchPerformaInvoices();
    fetchQuotations();
  }, []);

  const fetchPerformaInvoices = async () => {
    try { const res = await axios.get("http://localhost:3000/api/performainvoice"); setPerformaInvoices(res.data); }
    catch (err) { console.error(err); }
  };
  const fetchQuotations = async () => {
    try { const res = await axios.get("http://localhost:3000/api/quotations"); setQuotations(res.data); }
    catch (err) { console.error(err); }
  };
  // Client Autocomplete Logic
  const handleClientSearch = async (val) => {
    setClientSearch(val);
    if (!val.trim()) { setClientList([]); setShowClientDrop(false); return; }
    try {
      const res = await axios.get(`${CLIENT_API}/search?name=${encodeURIComponent(val)}`);
      setClientList(res.data); setShowClientDrop(true);
    } catch { setClientList([]); }
  };

  const selectClient = (client) => {
    setClientSearch(client.company_name || client.name);
    setClientList([]); setShowClientDrop(false);
    setCustomer({
      customer_name: client.name || "",
      mobile_number: client.phone || "",
      email: client.email || "",
      location_city: client.city || ""
    });
    setExtra(prev => ({
      ...prev,
      client_company: client.company_name || "",
      client_address1: client.address || "",
      client_address2: "",
      client_city: client.city || "",
      client_state: client.state || "",
      client_pincode: client.pincode || "",
      client_country: "India"
    }));
  };

  const handleSelectProposal = async (proposalId) => {
    if (!proposalId) return;
    try {
      const res = await axios.get(`http://localhost:3000/api/quotations/${proposalId}`);
      const rows = res.data;
      if (rows.length > 0) {
        const h = rows[0];
        setCustomer({ customer_name: h.customer_name, mobile_number: h.mobile_number, email: h.email, location_city: h.location_city });
        setClientSearch(h.client_company || h.customer_name || "");
        const loadedItems = rows.map(r => ({
          hsn_code: r.hsn_code || "",
          name: r.description,
          brand_model: r.brand_model || "",
          uom: r.uom || "Nos",
          price: Number(r.price) || 0,
          qty: Number(r.quantity) || 1,
          tax: Number(r.tax) || 18,
          discount: Number(r.discount) || 0
        }));
        setItems(loadedItems);
        
        let parsedTerms = defaultTerms;
        try {
          if (h.terms_json) {
            parsedTerms = JSON.parse(h.terms_json);
          }
        } catch (e) {}
        setTerms(parsedTerms);

        setExtra({
          client_company: h.client_company || "", client_address1: h.client_address1 || "",
          client_address2: h.client_address2 || "", client_city: h.client_city || "",
          client_state: h.client_state || "", client_pincode: h.client_pincode || "", client_country: h.client_country || "India",
          client_gstin: h.client_gstin || "",
          tax_type: h.tax_type || "GST18", custom_tax: h.custom_tax || "",
          exec_name: h.exec_name || "", exec_phone: h.exec_phone || "", exec_email: h.exec_email || "",
          validity: h.validity || "07-07-2026",
          terms_json: h.terms_json || JSON.stringify(defaultTerms)
        });
      }
    } catch (err) { alert("Error loading proposal data"); }
  };

  const handleEdit = async (id) => {
    const res = await axios.get(`http://localhost:3000/api/performainvoice/${id}`);
    const rows = res.data;
    const h = rows[0];
    setCustomer({ customer_name: h.customer_name, mobile_number: h.mobile_number, email: h.email, location_city: h.location_city });
    setPerformaInvoice({ invoice_date: h.invoice_date?.split("T")[0] || "" });
    setClientSearch(h.client_company || h.customer_name || "");
    const loadedItems = rows.map(r => ({
      hsn_code: r.hsn_code || "",
      name: r.description,
      brand_model: r.brand_model || "",
      uom: r.uom || "Nos",
      price: Number(r.price) || 0,
      qty: Number(r.quantity) || 1,
      tax: Number(r.tax) || 18,
      discount: Number(r.discount) || 0
    }));
    setItems(loadedItems);

    let parsedTerms = defaultTerms;
    try {
      if (h.terms_json) {
        parsedTerms = JSON.parse(h.terms_json);
      }
    } catch (e) {}
    setTerms(parsedTerms);

    setExtra({
      client_company: h.client_company || "", client_address1: h.client_address1 || "",
      client_address2: h.client_address2 || "", client_city: h.client_city || "",
      client_state: h.client_state || "", client_pincode: h.client_pincode || "", client_country: h.client_country || "India",
      client_gstin: h.client_gstin || "",
      tax_type: h.tax_type || "GST18", custom_tax: h.custom_tax || "",
      exec_name: h.exec_name || "", exec_phone: h.exec_phone || "", exec_email: h.exec_email || "",
      validity: h.validity || "07-07-2026",
      terms_json: h.terms_json || JSON.stringify(defaultTerms)
    });
    setEditId(id);
    setOpen(true);
  };

  const getTaxRate = () => {
    if (extra.tax_type === "GST5") return 5;
    if (extra.tax_type === "CUSTOM") return Number(extra.custom_tax) || 0;
    return 18;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!performaInvoice.invoice_date) return alert("Please select date");
    if (items.some(i => !i.name.trim())) return alert("Product description cannot be empty");
    try {
      const currentTaxRate = getTaxRate();
      const mappedItems = items.map(i => ({ ...i, tax: currentTaxRate }));
      const totals = calculateTotals(mappedItems);
      const payload = {
        customer,
        performaInvoice: {
          invoice_date: performaInvoice.invoice_date,
          subtotal: totals.subtotal, total_discount: totals.total_discount,
          total_cgst: totals.total_cgst, total_sgst: totals.total_sgst,
          total_tax: totals.total_cgst + totals.total_sgst, grand_total: totals.grand_total,
        },
        items: mappedItems.map(i => ({
          hsn_code: i.hsn_code,
          description: i.name, brand_model: i.brand_model, uom: i.uom,
          price: i.price, quantity: i.qty, tax: i.tax, discount: i.discount, subtotal: calculateItemTotal(i),
        })),
        extra: {
          ...extra,
          terms_json: JSON.stringify(terms)
        },
      };
      if (editId) {
        await axios.put(`http://localhost:3000/api/performainvoice/${editId}`, payload);
        alert("Updated successfully");
      } else {
        await axios.post("http://localhost:3000/api/performainvoice/create", payload);
        alert("Created successfully");
      }
      setOpen(false); resetForm(); fetchPerformaInvoices();
    } catch (err) { console.error(err); alert("Error saving Performa Invoice"); }
  };

  const resetForm = () => {
    setCustomer({ customer_name: "", mobile_number: "", email: "", location_city: "" });
    setItems([{ hsn_code: "", name: "", brand_model: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 }]);
    setClientSearch("");
    setPerformaInvoice({ invoice_date: new Date().toISOString().slice(0, 10) });
    setTerms(defaultTerms);
    setExtra(emptyExtra());
    setEditId(null);
  };

  const handleDelete = async () => {
    if (!selectedId) return alert("Select an item to delete");
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`http://localhost:3000/api/performainvoice/${selectedId}`);
      setSelectedId(null); setViewId(null); fetchPerformaInvoices();
    } catch (error) { console.error(error); }
  };

  const openMailModal = () => {
    if (!selectedId) return alert("Select an invoice to send");
    const inv = performaInvoices.find(p => p.id === selectedId);
    setMailTo(inv?.email || "");
    setMailSubject(`Proforma Invoice ${formatPINumber(selectedId, inv?.invoice_date)}`);
    setMailOpen(true);
  };

  const handleSendEmail = async () => {
    if (!mailTo) return alert("Please enter recipient email");
    setMailSending(true);
    try {
      await axios.post(`http://localhost:3000/api/performainvoice/send-email/${selectedId}`, { to: mailTo, subject: mailSubject });
      alert("Email sent successfully"); setMailOpen(false);
    } catch (error) { alert(error.response?.data?.message || "Failed to send email"); }
    finally { setMailSending(false); }
  };

  const updateItem = (i, field, value) => { const copy = [...items]; copy[i][field] = value; setItems(copy); };
  const addItem = () => { setItems(p => [...p, { hsn_code: "", name: "", brand_model: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 }]); };
  const removeItem = (index) => { if (items.length <= 1) return; setItems(prev => prev.filter((_, idx) => idx !== index)); };
  const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "---";

  const handleTermChange = (idx, value) => {
    const updated = [...terms];
    updated[idx] = value;
    setTerms(updated);
  };

  useEffect(() => {
    document.body.classList.toggle("modal-open", open || mailOpen);
    return () => document.body.classList.remove("modal-open");
  }, [open, mailOpen]);

  const filteredInvoices = performaInvoices.filter(q => q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const taxRate = getTaxRate();

  const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-2 mb-4 mt-6">
      <div className="h-1 w-6 bg-blue-500 rounded"></div>
      <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide">{children}</h3>
      <div className="flex-1 h-px bg-blue-100"></div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="invoice-heading-tab flex gap-4 justify-between items-center flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-[#1694CE]">Proforma Invoice</h2>
          <nav className="text-sm text-gray-500">Dashboard &gt; Finance &gt; Proforma Invoice</nav>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-3 bg-gray-100 px-3 py-1 rounded-lg border h-10 mt-2">
            <Search size={18} className="text-gray-500" />
            <input type="text" placeholder="Search by customer..." className="outline-none text-sm w-40 bg-transparent" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={downloadPDF} title="Download PDF" className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50 transition"><Download size={20} /></button>
            <button onClick={openMailModal} title="Send Email" className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50 transition"><Mail size={18} /></button>
            <button onClick={() => { if (!selectedId) return alert("Select an item"); handleEdit(selectedId); }} title="Edit" className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50 transition"><Edit2 size={18} /></button>
            <button onClick={handleDelete} title="Delete" className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50 transition"><Trash2 size={18} className="text-red-500" /></button>
          </div>
          <div className="mt-2">
            <button onClick={() => { resetForm(); setOpen(true); }} className="bg-[#FF3355] text-white w-12 h-12 rounded-full flex justify-center items-center shadow-lg hover:bg-[#e62848] transition"><Plus size={24} /></button>
          </div>
        </div>
      </div>

      {/* Table */}
      {!viewId && (
        <div className="bg-white shadow-sm rounded-xl mt-6 overflow-hidden border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm text-center border-collapse min-w-[600px]">
            <thead className="bg-[#f8fafc]">
              <tr className="text-gray-700 font-bold uppercase text-xs border-b border-gray-200">
                <th className="px-4 py-4 border-r">PI Number</th>
                <th className="px-4 py-4 border-r">Customer Name</th>
                <th className="px-4 py-4 border-r">Email</th>
                <th className="px-4 py-4 border-r">Mobile</th>
                <th className="px-4 py-4 border-r">Date</th>
                <th className="px-4 py-4 border-r">Total</th>
                <th className="px-4 py-4 border-r">City</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(p => (
                <tr key={p.id} onClick={() => setSelectedId(p.id)} onDoubleClick={() => { setViewId(p.id); setTimeout(() => setShowInvoice(true), 50); }}
                  className={`cursor-pointer border-b hover:bg-gray-50 transition ${selectedId === p.id ? "bg-blue-50/50" : ""}`}>
                  <td className="px-4 py-4 border-r font-medium text-blue-600">{formatPINumber(p.id, p.invoice_date)}</td>
                  <td className="px-4 py-4 border-r">{p.customer_name}</td>
                  <td className="px-4 py-4 border-r text-gray-500">{p.email || "---"}</td>
                  <td className="px-4 py-4 border-r">{p.mobile_number}</td>
                  <td className="px-4 py-4 border-r">{formatDate(p.invoice_date)}</td>
                  <td className="px-4 py-4 border-r font-bold text-gray-900">&#8377;{p.grand_total?.toLocaleString()}</td>
                  <td className="px-4 py-4 border-r">{p.location_city}</td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (<tr><td colSpan="7" className="py-10 text-gray-400 italic">No invoices found</td></tr>)}
            </tbody>
          </table>
          <p className="p-3 text-xs text-gray-400 italic text-left">Double-click a row to preview invoice</p>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      <div className={`overlay ${open ? "show" : ""} flex justify-center items-start overflow-y-auto pt-6 pb-10`}>
        <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-5xl p-8 relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{editId ? "Edit Proforma Invoice" : "Create Proforma Invoice"}</h2>
            <X className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => { setOpen(false); resetForm(); }} />
          </div>

          {/* Quick fill */}
          <div className="mb-4 bg-blue-50 p-3 rounded-lg flex items-center gap-4 border border-blue-100">
            <span className="text-sm font-semibold text-blue-800">Quick Fill from Proposal:</span>
            <select onChange={e => handleSelectProposal(e.target.value)} className="bg-white border text-sm rounded-md px-3 py-1.5 outline-none flex-1 max-w-xs">
              <option value="">Select a Proposal</option>
              {quotations.map(q => <option key={q.id} value={q.id}>{q.customer_name} (#{q.id})</option>)}
            </select>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── SECTION 2: CLIENT DETAILS (TO ADDRESS) ── */}
            <SectionTitle>Client Details (To Address)</SectionTitle>
            
            {/* Search client input */}
            <div className="relative mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Search & Autocomplete Client Details</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={clientSearch} onChange={e => handleClientSearch(e.target.value)}
                  placeholder="Search client by name or company..." autoComplete="off"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              {showClientDrop && clientList.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {clientList.map((c, i) => (
                    <button key={i} type="button" onClick={() => selectClient(c)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b last:border-0 flex justify-between items-center">
                      <span className="font-semibold">{c.company_name || c.name}</span>
                      <span className="text-xs text-gray-400">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Company Name</label>
                <input type="text" value={extra.client_company} onChange={e => setExtra(ex => ({ ...ex, client_company: e.target.value }))} placeholder="e.g. ABC Technologies" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Customer Name *</label>
                <input type="text" value={customer.customer_name} onChange={e => setCustomer({ ...customer, customer_name: e.target.value })} placeholder="e.g. Ravi Kumar" className="border rounded-lg px-3 py-2 outline-none text-sm" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Mobile Number *</label>
                <input type="text" value={customer.mobile_number} onChange={e => setCustomer({ ...customer, mobile_number: e.target.value })} className="border rounded-lg px-3 py-2 outline-none text-sm" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                <input type="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Address Line 1</label>
                <input type="text" value={extra.client_address1} onChange={e => setExtra(ex => ({ ...ex, client_address1: e.target.value }))} placeholder="Street / Building" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Address Line 2 (Optional)</label>
                <input type="text" value={extra.client_address2} onChange={e => setExtra(ex => ({ ...ex, client_address2: e.target.value }))} placeholder="Area / Landmark" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">City / District</label>
                <input type="text" value={extra.client_city} onChange={e => setExtra(ex => ({ ...ex, client_city: e.target.value }))} placeholder="e.g. Chennai" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">State</label>
                <input type="text" value={extra.client_state} onChange={e => setExtra(ex => ({ ...ex, client_state: e.target.value }))} placeholder="e.g. Tamil Nadu" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">PIN Code</label>
                <input type="text" value={extra.client_pincode} onChange={e => setExtra(ex => ({ ...ex, client_pincode: e.target.value }))} placeholder="e.g. 600001" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Country</label>
                <input type="text" value={extra.client_country} readOnly className="border rounded-lg px-3 py-2 outline-none bg-gray-50 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Client GSTIN (Optional)</label>
                <input type="text" value={extra.client_gstin} onChange={e => setExtra(ex => ({ ...ex, client_gstin: e.target.value }))} placeholder="e.g. 33XXXXX1234X1Z5" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Invoice Date *</label>
                <input type="date" value={performaInvoice.invoice_date} onChange={e => setPerformaInvoice({ ...performaInvoice, invoice_date: e.target.value })} className="border rounded-lg px-3 py-2 outline-none text-sm" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Validity Period (e.g. 07-07-2026)</label>
                <input type="text" value={extra.validity} onChange={e => setExtra(ex => ({ ...ex, validity: e.target.value }))} placeholder="e.g. 15 days or Date" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
            </div>

            {/* ── SECTION 3: TAX CONFIG ── */}
            <SectionTitle>Tax Configuration</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition ${extra.tax_type === "GST18" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" name="tax_type" value="GST18" checked={extra.tax_type === "GST18"} onChange={e => setExtra(ex => ({ ...ex, tax_type: e.target.value }))} className="accent-blue-600" />
                <span className="text-sm font-medium">GST 18%</span>
              </label>
              <label className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition ${extra.tax_type === "GST5" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" name="tax_type" value="GST5" checked={extra.tax_type === "GST5"} onChange={e => setExtra(ex => ({ ...ex, tax_type: e.target.value }))} className="accent-blue-600" />
                <span className="text-sm font-medium">GST 5%</span>
              </label>
              <label className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition ${extra.tax_type === "CUSTOM" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" name="tax_type" value="CUSTOM" checked={extra.tax_type === "CUSTOM"} onChange={e => setExtra(ex => ({ ...ex, tax_type: e.target.value }))} className="accent-blue-600" />
                <span className="text-sm font-medium">Custom GST %</span>
              </label>
            </div>
            {extra.tax_type === "CUSTOM" && (
              <div className="flex flex-col gap-1 max-w-xs">
                <label className="text-xs font-bold text-gray-500 uppercase">Custom GST %</label>
                <input type="number" value={extra.custom_tax} onChange={e => setExtra(ex => ({ ...ex, custom_tax: e.target.value }))} placeholder="e.g. 12" min="0" max="100" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
            )}

            {/* ── SECTION 4: ITEMS INPUT TABLE ── */}
            <SectionTitle>Quote Items</SectionTitle>
            <div className="border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-center text-sm min-w-[850px]">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-gray-600 font-bold uppercase text-[10.5px]">
                    <th className="px-3 py-3 w-10">S.No</th>
                    <th className="px-3 py-3 w-32">HSN Code</th>
                    <th className="px-3 py-3 text-left">Product / Description *</th>
                    <th className="px-3 py-3 w-28">UOM</th>
                    <th className="px-3 py-3 w-20">Qty</th>
                    <th className="px-3 py-3 w-24">Rate (₹)</th>
                    <th className="px-3 py-3 w-16">GST %</th>
                    <th className="px-3 py-3 w-28">Tax Value</th>
                    <th className="px-3 py-3 w-28 text-right">Amount (₹)</th>
                    <th className="px-2 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const itemTax = taxRate;
                    const taxVal = item.qty * item.price * (itemTax / 100);
                    const itemAmt = item.qty * item.price;

                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-2 py-2">
                          <input type="text" value={item.hsn_code} onChange={e => updateItem(i, "hsn_code", e.target.value)} className="w-full border rounded px-2 py-1 text-sm outline-none text-center" placeholder="HSN Code" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" value={item.name} onChange={e => updateItem(i, "name", e.target.value)} className="w-full border rounded px-2 py-1 text-sm outline-none" placeholder="Product details" required />
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" value={item.uom} onChange={e => updateItem(i, "uom", e.target.value)} className="w-full border rounded px-2 py-1 text-sm outline-none text-center" placeholder="e.g. MTR / Nos" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={item.qty} onChange={e => updateItem(i, "qty", Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm outline-none text-center" min="1" required />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" step="any" value={item.price} onChange={e => updateItem(i, "price", Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm outline-none text-right" required />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={itemTax} readOnly className="w-full text-center text-gray-400 bg-transparent outline-none cursor-not-allowed text-sm font-semibold" />
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-right font-medium">₹{taxVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-800">₹{itemAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-2 text-center">
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="bg-gray-50 p-3 flex gap-4">
                <button type="button" onClick={addItem} className="flex items-center gap-2 text-blue-600 font-bold text-xs hover:underline"><PlusCircle size={14} /> Add Line Item</button>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-2">
              <div className="w-72 space-y-2 bg-gray-50 rounded-xl p-4 border">
                {(() => {
                  const mappedItems = items.map(i => ({ ...i, tax: taxRate }));
                  const totals = calculateTotals(mappedItems);
                  return (<>
                    <div className="flex justify-between text-sm text-gray-600"><span>Subtotal (Exclusive)</span><span>₹{totals.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>CGST ({taxRate/2}%)</span><span>₹{totals.total_cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between text-sm text-gray-600 border-b border-gray-200 pb-2"><span>SGST ({taxRate/2}%)</span><span>₹{totals.total_sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between border-t pt-2 text-lg font-bold text-blue-700"><span>Net Total</span><span>₹{totals.grand_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                  </>);
                })()}
              </div>
            </div>

            {/* ── SECTION 5: EXECUTIVE DETAILS ── */}
            <SectionTitle>Executive Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Executive Name</label>
                <input type="text" value={extra.exec_name} onChange={e => setExtra(ex => ({ ...ex, exec_name: e.target.value }))} placeholder="e.g. Krishna Kumar" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Contact Number</label>
                <input type="text" value={extra.exec_phone} onChange={e => setExtra(ex => ({ ...ex, exec_phone: e.target.value }))} placeholder="e.g. +91 90036 63660" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Email ID</label>
                <input type="email" value={extra.exec_email} onChange={e => setExtra(ex => ({ ...ex, exec_email: e.target.value }))} placeholder="biz@madhuratech.com" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
            </div>

            {/* ── SECTION 6: TERMS & CONDITIONS (5 Input Boxes) ── */}
            <SectionTitle>Terms &amp; Conditions (5 Editable Items)</SectionTitle>
            <div className="space-y-3 bg-gray-50 rounded-xl p-5 border border-gray-200">
              {terms.map((term, tIdx) => (
                <div key={tIdx} className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Term {tIdx + 1}</label>
                  <input type="text" value={term} onChange={e => handleTermChange(tIdx, e.target.value)} className="border rounded-lg px-3 py-2 outline-none text-sm bg-white" placeholder={`Enter Term ${tIdx + 1}...`} />
                </div>
              ))}
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <button type="submit" className="bg-[#1694CE] text-white px-10 py-2.5 rounded-lg hover:bg-[#1279a8] font-bold shadow-lg transition">Save Invoice</button>
              <button type="button" onClick={() => { setOpen(false); resetForm(); }} className="bg-gray-200 text-gray-600 px-10 py-2.5 rounded-lg hover:bg-gray-300 font-bold transition">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      {/* Mail Modal */}
      <div className={`overlay ${mailOpen ? "show" : ""} flex justify-center items-center`}>
        <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-lg p-8 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Mail size={20} /> Send Proforma Invoice</h2>
            <X className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setMailOpen(false)} />
          </div>
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">To (Email)</label>
              <input type="email" value={mailTo} onChange={e => setMailTo(e.target.value)} className="border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-100" placeholder="recipient@email.com" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Subject</label>
              <input type="text" value={mailSubject} onChange={e => setMailSubject(e.target.value)} className="border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <div className="flex gap-4 pt-6">
            <button onClick={handleSendEmail} disabled={mailSending} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-gray-300 font-bold shadow transition disabled:opacity-60">
              {mailSending ? "Sending..." : "Send Email"}
            </button>
            <button onClick={() => setMailOpen(false)} className="bg-gray-200 text-gray-600 px-8 py-2.5 rounded-lg hover:bg-gray-300 font-bold transition">Cancel</button>
          </div>
        </div>
      </div>

      {/* Invoice Preview */}
      {viewId && (
        <div className={`invoicewrapper w-full mt-6 bg-white shadow-xl p-6 relative overflow-y-auto ${showinvoice ? "See" : ""}`}>
          <div className="flex gap-3 absolute right-6 top-6 z-10">
            <X className="cursor-pointer text-gray-400 hover:text-red-500 bg-white rounded-full p-1" onClick={() => { setShowInvoice(false); setTimeout(() => setViewId(null), 400); }} />
          </div>
          <div ref={invoiceRef}>
            <Invoice performaInvoiceId={viewId} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformaInvoice;
