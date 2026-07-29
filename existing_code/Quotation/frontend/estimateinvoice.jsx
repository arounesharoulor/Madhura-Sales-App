import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Download, X, Edit2, MinusCircle, PlusCircle, Trash2, Mail, MapPin, ChevronDown } from "lucide-react";
import { calculateItemTotal, calculateTotals } from "../utils/invoicecal";
import axios from "axios";
import html2pdf from "html2pdf.js";
import "../Styles/tailwind.css";
import Invoice from "../components/invoicetemplate";

const UOM_OPTIONS = ["Nos", "Units", "Pieces", "Boxes", "Sets", "Meters", "Kg", "Liters"];
const TAX_OPTIONS = [
  { value: "GST18", label: "GST 18%" },
  { value: "GST5", label: "GST 5%" },
  { value: "CUSTOM", label: "Custom GST" },
];
const PAYMENT_OPTIONS = ["100% Advance", "Payment Against Delivery", "15 Days", "30 Days", "45 Days", "Custom"];
const WARRANTY_OPTIONS = ["No Warranty", "Testing Warranty", "1 Month", "3 Months", "6 Months", "12 Months", "24 Months", "36 Months", "OEM Warranty", "Supplier Warranty", "OEM Hardware Warranty", "No Software Warranty"];

const emptyExtra = () => ({
  from_address_id: "", from_address_custom: "",
  client_company: "", client_address1: "", client_address2: "",
  client_city: "", client_state: "", client_pincode: "", client_country: "India",
  tax_type: "GST18", custom_tax: "",
  exec_name: "", exec_phone: "", exec_email: "",
  terms_general: false, terms_tax: false,
  terms_project_period: "30-60 days from Purchase Order date",
  terms_validity: true,
  terms_separate_orders: { material: false, installation: false, usd: false, boq: false },
  terms_payment: "", terms_payment_custom: "", terms_warranty: "",
});

const EstimateInvoice = () => {

  const [quotations, setQuotations] = useState([]);
  const [fromAddresses, setFromAddresses] = useState([]);
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
  const [descInput, setDescInput] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState("");
  const [newAddrText, setNewAddrText] = useState("");

  const [items, setItems] = useState([{ name: "", brand_model: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 }]);
  const [customer, setCustomer] = useState({ customer_name: "", mobile_number: "", email: "", location_city: "" });
  const [estimateInvoice, setEstimateInvoice] = useState({ invoice_date: new Date().toISOString().slice(0, 10) });
  const [estimateInvoices, setEstimateInvoices] = useState([]);
  const [extra, setExtra] = useState(emptyExtra());

  const invoiceRef = useRef(null);

  const formatEINumber = (id, dateStr) => {
    const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
    return `EI-${year}-${String(id).padStart(3, "0")}`;
  };

  useEffect(() => {
    fetchEstimateInvoices();
    fetchQuotations();
    fetchFromAddresses();
  }, []);

  const fetchEstimateInvoices = async () => {
    try { const res = await axios.get("http://localhost:3000/api/estimate-invoice"); setEstimateInvoices(res.data); }
    catch (err) { console.error(err); }
  };
  const fetchQuotations = async () => {
    try { const res = await axios.get("http://localhost:3000/api/quotations"); setQuotations(res.data); }
    catch (err) { console.error(err); }
  };
  const fetchFromAddresses = async () => {
    try { const res = await axios.get("http://localhost:3000/api/estimate-invoice/from-addresses"); setFromAddresses(res.data); }
    catch (err) { console.error(err); }
  };

  const handleAddAddress = async () => {
    if (!newAddrLabel || !newAddrText) return alert("Label and address required");
    try {
      const res = await axios.post("http://localhost:3000/api/estimate-invoice/from-addresses", { label: newAddrLabel, address: newAddrText });
      setFromAddresses(prev => [...prev, res.data]);
      setNewAddrLabel(""); setNewAddrText(""); setShowAddAddress(false);
    } catch (err) { alert("Failed to add address"); }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm("Remove this address?")) return;
    try {
      await axios.delete(`http://localhost:3000/api/estimate-invoice/from-addresses/${id}`);
      setFromAddresses(prev => prev.filter(a => a.id !== id));
      if (extra.from_address_id === id) setExtra(e => ({ ...e, from_address_id: "" }));
    } catch (err) { alert("Failed to delete address"); }
  };

  const handleSelectProposal = async (proposalId) => {
    if (!proposalId) return;
    try {
      const res = await axios.get(`http://localhost:3000/api/quotations/${proposalId}`);
      const rows = res.data;
      if (rows.length > 0) {
        const h = rows[0];
        setCustomer({ customer_name: h.customer_name, mobile_number: h.mobile_number, email: h.email, location_city: h.location_city });
        const loadedItems = rows.map(r => ({ name: r.description, brand_model: "", uom: "Nos", price: Number(r.price) || 0, qty: Number(r.quantity) || 1, tax: 18, discount: Number(r.discount) || 0 }));
        setItems(loadedItems);
        setDescInput(loadedItems.map(i => i.name).join(", "));
      }
    } catch (err) { alert("Error loading proposal data"); }
  };

  const handleEdit = async (id) => {
    const res = await axios.get(`http://localhost:3000/api/estimate-invoice/${id}`);
    const rows = res.data;
    const h = rows[0];
    setCustomer({ customer_name: h.customer_name, mobile_number: h.mobile_number, email: h.email, location_city: h.location_city });
    setEstimateInvoice({ invoice_date: h.invoice_date?.split("T")[0] || "" });
    const loadedItems = rows.map(r => ({ name: r.description, brand_model: r.brand_model || "", uom: r.uom || "Nos", price: Number(r.price) || 0, qty: Number(r.quantity) || 1, tax: 18, discount: Number(r.discount) || 0 }));
    setItems(loadedItems);
    setDescInput(loadedItems.map(i => i.name).join(", "));
    setExtra({
      from_address_id: h.from_address_id || "", from_address_custom: h.from_address_custom || "",
      client_company: h.client_company || "", client_address1: h.client_address1 || "",
      client_address2: h.client_address2 || "", client_city: h.client_city || "",
      client_state: h.client_state || "", client_pincode: h.client_pincode || "", client_country: h.client_country || "India",
      tax_type: h.tax_type || "GST18", custom_tax: h.custom_tax || "",
      exec_name: h.exec_name || "", exec_phone: h.exec_phone || "", exec_email: h.exec_email || "",
      terms_general: !!h.terms_general, terms_tax: !!h.terms_tax,
      terms_project_period: h.terms_project_period || "30-60 days from Purchase Order date",
      terms_validity: h.terms_validity !== 0,
      terms_separate_orders: h.terms_separate_orders ? JSON.parse(h.terms_separate_orders) : { material: false, installation: false, usd: false, boq: false },
      terms_payment: h.terms_payment || "", terms_payment_custom: h.terms_payment_custom || "",
      terms_warranty: h.terms_warranty || "",
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
    if (!estimateInvoice.invoice_date) return alert("Please select date");
    if (items.some(i => !i.name.trim())) return alert("Description cannot be empty");
    try {
      const taxRate = getTaxRate();
      const taxedItems = items.map(i => ({ ...i, tax: taxRate }));
      const totals = calculateTotals(taxedItems);
      const payload = {
        customer,
        invoice: {
          invoice_date: estimateInvoice.invoice_date,
          subtotal: totals.subtotal, total_discount: totals.total_discount,
          total_cgst: totals.total_cgst, total_sgst: totals.total_sgst,
          total_tax: totals.total_cgst + totals.total_sgst, grand_total: totals.grand_total,
        },
        items: taxedItems.map(i => ({
          description: i.name, brand_model: i.brand_model, uom: i.uom,
          price: i.price, quantity: i.qty, tax: taxRate, discount: i.discount, subtotal: calculateItemTotal(i),
        })),
        extra,
      };
      if (editId) {
        await axios.put(`http://localhost:3000/api/estimate-invoice/${editId}`, payload);
        alert("Updated successfully");
      } else {
        await axios.post("http://localhost:3000/api/estimate-invoice/create", payload);
        alert("Created successfully");
      }
      setOpen(false); resetForm(); fetchEstimateInvoices();
    } catch (err) { console.error(err); alert("Error saving Estimate Invoice"); }
  };

  const resetForm = () => {
    setCustomer({ customer_name: "", mobile_number: "", email: "", location_city: "" });
    setItems([{ name: "", brand_model: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 }]);
    setDescInput("");
    setEstimateInvoice({ invoice_date: new Date().toISOString().slice(0, 10) });
    setExtra(emptyExtra());
    setEditId(null);
  };

  const handleDelete = async () => {
    if (!selectedId) return alert("Select an item to delete");
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`http://localhost:3000/api/estimate-invoice/${selectedId}`);
      setSelectedId(null); fetchEstimateInvoices();
    } catch (error) { console.error(error); }
  };

  const openMailModal = () => {
    if (!selectedId) return alert("Select an invoice to send");
    const inv = estimateInvoices.find(p => p.id === selectedId);
    setMailTo(inv?.email || "");
    setMailSubject(`Estimate Invoice ${formatEINumber(selectedId, inv?.invoice_date)}`);
    setMailOpen(true);
  };

  const handleSendEmail = async () => {
    if (!mailTo) return alert("Please enter recipient email");
    setMailSending(true);
    try {
      await axios.post(`http://localhost:3000/api/estimate-invoice/send-email/${selectedId}`, { to: mailTo, subject: mailSubject });
      alert("Email sent successfully"); setMailOpen(false);
    } catch (error) { alert(error.response?.data?.message || "Failed to send email"); }
    finally { setMailSending(false); }
  };

  const handleDescInput = (value) => {
    setDescInput(value);
    const parts = value.split(",").map(s => s.trim()).filter(s => s.length > 0);
    if (parts.length === 0) { setItems([{ name: "", brand_model: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 }]); }
    else { setItems(prev => parts.map((part, i) => ({ name: part, brand_model: prev[i]?.brand_model || "", uom: prev[i]?.uom || "Nos", price: prev[i]?.price || 0, qty: prev[i]?.qty || 1, tax: 18, discount: prev[i]?.discount || 0 }))); }
  };

  const updateItem = (i, field, value) => { const copy = [...items]; copy[i][field] = value; setItems(copy); };
  const addItem = () => { setItems(p => [...p, { name: "", brand_model: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 }]); setDescInput(prev => prev ? prev + ", " : ""); };
  const removeItem = () => { if (items.length <= 1) return; const n = items.slice(0, -1); setItems(n); setDescInput(n.map(i => i.name).join(", ")); };
  const formatDate = (date) => date ? new Date(date).toLocaleString("en-IN", { dateStyle: "medium" }) : "---";

  useEffect(() => {
    document.body.classList.toggle("modal-open", open || mailOpen);
    return () => document.body.classList.remove("modal-open");
  }, [open, mailOpen]);

  const filteredInvoices = estimateInvoices.filter(q => q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()));
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
          <h2 className="text-2xl font-bold text-[#1694CE]">Estimation</h2>
          <nav className="text-sm text-gray-500">Dashboard &gt; Finance &gt; Estimation</nav>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-3 bg-gray-100 px-3 py-1 rounded-lg border h-10 mt-2">
            <Search size={18} className="text-gray-500" />
            <input type="text" placeholder="Search by customer..." className="outline-none text-sm w-40 bg-transparent" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => { if (invoiceRef.current) { html2pdf().from(invoiceRef.current).set({ margin: 10, filename: `Estimate_Invoice_${viewId}.pdf`, image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).save(); } }} title="Download PDF" className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50 transition"><Download size={20} /></button>
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
              <th className="px-4 py-4 border-r">EI Number</th>
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
                <td className="px-4 py-4 border-r font-medium text-blue-600">{formatEINumber(p.id, p.invoice_date)}</td>
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
      </div>
      )}

      {/* Create/Edit Form Modal */}
      <div className={`overlay ${open ? "show" : ""} flex justify-center items-start overflow-y-auto pt-6 pb-10`}>
        <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-5xl p-8 relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{editId ? "Edit Estimation" : "Create Estimation"}</h2>
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

            {/* ── SECTION 1: FROM ADDRESS ── */}
            <SectionTitle>From Address</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Select Office Address</label>
                <select value={extra.from_address_id} onChange={e => setExtra(ex => ({ ...ex, from_address_id: e.target.value === "ADD_NEW" ? "" : e.target.value, from_address_custom: "" }))}
                  className="border rounded-lg px-3 py-2 outline-none bg-white text-sm">
                  <option value="">-- Select Address --</option>
                  {fromAddresses.map(a => (
                    <option key={a.id} value={a.id}>{a.label} — {a.address.substring(0, 40)}...</option>
                  ))}
                  <option value="ADD_NEW">+ Add New Address</option>
                </select>
                {extra.from_address_id && extra.from_address_id !== "" && (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {fromAddresses.filter(a => String(a.id) === String(extra.from_address_id)).map(a => (
                      <div key={a.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 flex-1">
                        <MapPin size={12} /> <span>{a.address}</span>
                        <button type="button" onClick={() => handleDeleteAddress(a.id)} className="ml-auto text-red-400 hover:text-red-600"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Custom Address (Optional)</label>
                <textarea value={extra.from_address_custom} onChange={e => setExtra(ex => ({ ...ex, from_address_custom: e.target.value }))}
                  placeholder="Enter custom address..." className="border rounded-lg px-3 py-2 outline-none text-sm min-h-[70px]" />
              </div>
            </div>

            {/* Add new address inline */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowAddAddress(p => !p)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus size={12} /> Add New Address to List
              </button>
            </div>
            {showAddAddress && (
              <div className="bg-gray-50 border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={newAddrLabel} onChange={e => setNewAddrLabel(e.target.value)} placeholder="Label (e.g. Coimbatore)" className="border rounded-lg px-3 py-2 text-sm outline-none" />
                <input value={newAddrText} onChange={e => setNewAddrText(e.target.value)} placeholder="Full address..." className="border rounded-lg px-3 py-2 text-sm outline-none col-span-1 md:col-span-1" />
                <div className="flex gap-2">
                  <button type="button" onClick={handleAddAddress} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Save</button>
                  <button type="button" onClick={() => setShowAddAddress(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* ── SECTION 2: CLIENT DETAILS (TO ADDRESS) ── */}
            <SectionTitle>Client Details (To Address)</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Reference No</label>
                <input type="text" value={editId ? "Auto-generated" : "Will be auto-generated"} readOnly className="border rounded-lg px-3 py-2 outline-none bg-gray-50 text-gray-400 text-sm cursor-not-allowed" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Company Name</label>
                <input type="text" value={extra.client_company} onChange={e => setExtra(ex => ({ ...ex, client_company: e.target.value }))} placeholder="e.g. ABC Technologies" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Customer Name *</label>
                <input type="text" value={customer.customer_name} onChange={e => { if (!/[0-9]/.test(e.nativeEvent.data)) setCustomer({ ...customer, customer_name: e.target.value }); }} placeholder="e.g. Ravi Kumar" className="border rounded-lg px-3 py-2 outline-none text-sm" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Mobile Number *</label>
                <input type="text" value={customer.mobile_number} onChange={e => { if (/^\d{0,13}$/.test(e.target.value)) setCustomer({ ...customer, mobile_number: e.target.value }); }} maxLength={13} inputMode="numeric" className="border rounded-lg px-3 py-2 outline-none text-sm" required />
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
                <input type="text" value={extra.client_pincode} onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setExtra(ex => ({ ...ex, client_pincode: e.target.value })); }} maxLength={6} inputMode="numeric" placeholder="e.g. 600001" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Country</label>
                <input type="text" value={extra.client_country} readOnly className="border rounded-lg px-3 py-2 outline-none bg-gray-50 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Invoice Date *</label>
                <input type="date" value={estimateInvoice.invoice_date} onChange={e => setEstimateInvoice({ ...estimateInvoice, invoice_date: e.target.value })} className="border rounded-lg px-3 py-2 outline-none text-sm" required />
              </div>
            </div>

            {/* ── SECTION 3: TAX CONFIG ── */}
            <SectionTitle>Tax Configuration</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TAX_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition ${extra.tax_type === opt.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="tax_type" value={opt.value} checked={extra.tax_type === opt.value} onChange={e => setExtra(ex => ({ ...ex, tax_type: e.target.value }))} className="accent-blue-600" />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
            {extra.tax_type === "CUSTOM" && (
              <div className="flex flex-col gap-1 max-w-xs">
                <label className="text-xs font-bold text-gray-500 uppercase">Custom GST %</label>
                <input type="number" value={extra.custom_tax} onChange={e => setExtra(ex => ({ ...ex, custom_tax: e.target.value }))} placeholder="e.g. 12" min="0" max="100" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
            )}

            {/* ── SECTION 4: ITEMS TABLE ── */}
            <SectionTitle>Quote Items</SectionTitle>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-bold text-gray-500 uppercase">Description (Comma-split)</label>
              <textarea value={descInput} onChange={e => handleDescInput(e.target.value)} placeholder="e.g. Laptop, Monitor, Keyboard" className="border rounded-lg px-3 py-2 outline-none min-h-[60px] text-sm" />
              <p className="text-[10px] text-orange-500 italic font-medium">Use commas to split items automatically</p>
            </div>
            <div className="border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-center text-sm min-w-[700px]">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-gray-600 font-bold uppercase text-[10px]">
                    <th className="px-3 py-3 text-left">S.No</th>
                    <th className="px-3 py-3 text-left">Description</th>
                    <th className="px-3 py-3 text-left">Brand & Model</th>
                    <th className="px-3 py-3">UOM</th>
                    <th className="px-3 py-3">Price</th>
                    <th className="px-3 py-3">Qty</th>
                    <th className="px-3 py-3 text-gray-400">Tax %</th>
                    <th className="px-3 py-3">Disc (&#8377;)</th>
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2"><input type="text" value={item.name} onChange={e => updateItem(i, "name", e.target.value)} className="w-full outline-none bg-transparent text-sm" placeholder="Description" /></td>
                      <td className="px-3 py-2"><input type="text" value={item.brand_model} onChange={e => updateItem(i, "brand_model", e.target.value)} className="w-full outline-none bg-transparent text-sm" placeholder="Brand/Model" /></td>
                      <td className="px-3 py-2">
                        <select value={item.uom} onChange={e => updateItem(i, "uom", e.target.value)} className="border rounded px-2 py-1 text-xs outline-none bg-white">
                          {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                          <option value="custom">Custom</option>
                        </select>
                        {item.uom === "custom" && <input type="text" placeholder="Enter UOM" onChange={e => updateItem(i, "uom", e.target.value)} className="mt-1 border rounded px-2 py-1 text-xs w-full outline-none" />}
                      </td>
                      <td className="px-3 py-2"><input type="number" value={item.price} onChange={e => updateItem(i, "price", Number(e.target.value))} className="w-20 text-center outline-none bg-transparent text-sm" /></td>
                      <td className="px-3 py-2"><input type="number" value={item.qty} onChange={e => updateItem(i, "qty", Number(e.target.value))} className="w-12 text-center outline-none bg-transparent text-sm" /></td>
                      <td className="px-3 py-2"><input type="number" value={taxRate} readOnly className="w-12 text-center text-gray-400 bg-transparent outline-none cursor-not-allowed text-sm" /></td>
                      <td className="px-3 py-2"><input type="number" value={item.discount} onChange={e => updateItem(i, "discount", Number(e.target.value))} className="w-20 text-center outline-none bg-transparent text-sm" /></td>
                      <td className="px-3 py-2 text-right font-bold text-sm">&#8377;{calculateItemTotal({ ...item, tax: taxRate }).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-gray-50 p-3 flex gap-4">
                <button type="button" onClick={addItem} className="flex items-center gap-2 text-blue-600 font-bold text-xs hover:underline"><PlusCircle size={14} /> Add Line</button>
                <button type="button" onClick={removeItem} className="flex items-center gap-2 text-red-500 font-bold text-xs hover:underline"><MinusCircle size={14} /> Remove Line</button>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-2">
              <div className="w-72 space-y-2">
                {(() => {
                  const taxedItems = items.map(i => ({ ...i, tax: taxRate }));
                  const totals = calculateTotals(taxedItems);
                  return (<>
                    <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>&#8377;{totals.subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>Discount</span><span>-&#8377;{totals.total_discount.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>CGST ({taxRate / 2}%)</span><span>&#8377;{totals.total_cgst.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>SGST ({taxRate / 2}%)</span><span>&#8377;{totals.total_sgst.toLocaleString()}</span></div>
                    <div className="flex justify-between border-t pt-2 text-lg font-bold text-blue-700"><span>Grand Total</span><span>&#8377;{totals.grand_total.toLocaleString()}</span></div>
                  </>);
                })()}
              </div>
            </div>

            {/* ── SECTION 5: EXECUTIVE DETAILS ── */}
            <SectionTitle>Executive Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Executive Name</label>
                <input type="text" value={extra.exec_name} onChange={e => { if (!/[0-9]/.test(e.nativeEvent.data)) setExtra(ex => ({ ...ex, exec_name: e.target.value })); }} placeholder="e.g. Anbu Selvan" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Contact Number</label>
                <input type="text" value={extra.exec_phone} onChange={e => { if (/^\d{0,13}$/.test(e.target.value)) setExtra(ex => ({ ...ex, exec_phone: e.target.value })); }} maxLength={13} inputMode="numeric" placeholder="e.g. 9876543210" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Email ID</label>
                <input type="email" value={extra.exec_email} onChange={e => setExtra(ex => ({ ...ex, exec_email: e.target.value }))} placeholder="exec@company.com" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
            </div>

            {/* ── SECTION 6: TERMS & CONDITIONS ── */}
            <SectionTitle>Terms &amp; Conditions</SectionTitle>
            <div className="space-y-4 bg-gray-50 rounded-xl p-5 border border-gray-200">

              {/* General */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={extra.terms_general} onChange={e => setExtra(ex => ({ ...ex, terms_general: e.target.checked }))} className="mt-1 accent-blue-600 w-4 h-4" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">General Terms &amp; Conditions</p>
                  <p className="text-xs text-gray-500">Standard terms apply to this quotation</p>
                </div>
              </label>

              {/* Tax */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={extra.terms_tax} onChange={e => setExtra(ex => ({ ...ex, terms_tax: e.target.checked }))} className="mt-1 accent-blue-600 w-4 h-4" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Tax</p>
                  <p className="text-xs text-gray-500">Prices quoted are exclusive of Sales and Service Tax (SEZ – NIL Tax applicable)</p>
                </div>
              </label>

              {/* Project Period */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Project Period</label>
                <input type="text" value={extra.terms_project_period} onChange={e => setExtra(ex => ({ ...ex, terms_project_period: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm bg-white" placeholder="e.g. 30-60 days from Purchase Order date" />
              </div>

              {/* Validity */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={extra.terms_validity} onChange={e => setExtra(ex => ({ ...ex, terms_validity: e.target.checked }))} className="mt-1 accent-blue-600 w-4 h-4" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Validity</p>
                  <p className="text-xs text-gray-500">Quote valid for 15 days from the date of quotation</p>
                </div>
              </label>

              {/* Separate Orders */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Separate Orders</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { key: "material", label: "A. Material Supply (As per actuals)" },
                    { key: "installation", label: "B. Installation / Services" },
                    { key: "usd", label: "C. Price may vary based on USD rates" },
                    { key: "boq", label: "D. Factory BOQ may vary" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={extra.terms_separate_orders?.[key] || false}
                        onChange={e => setExtra(ex => ({ ...ex, terms_separate_orders: { ...ex.terms_separate_orders, [key]: e.target.checked } }))}
                        className="accent-blue-600 w-4 h-4" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Terms */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Payment Terms</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PAYMENT_OPTIONS.map(opt => (
                    <label key={opt} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm transition ${extra.terms_payment === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="terms_payment" value={opt} checked={extra.terms_payment === opt} onChange={e => setExtra(ex => ({ ...ex, terms_payment: e.target.value }))} className="accent-blue-600" />
                      {opt}
                    </label>
                  ))}
                </div>
                {extra.terms_payment === "Custom" && (
                  <input type="text" value={extra.terms_payment_custom} onChange={e => setExtra(ex => ({ ...ex, terms_payment_custom: e.target.value }))} placeholder="Enter custom payment terms..." className="mt-2 border rounded-lg px-3 py-2 outline-none text-sm w-full bg-white" />
                )}
              </div>

              {/* Warranty */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Warranty</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {WARRANTY_OPTIONS.map(opt => (
                    <label key={opt} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-xs transition ${extra.terms_warranty === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="terms_warranty" value={opt} checked={extra.terms_warranty === opt} onChange={e => setExtra(ex => ({ ...ex, terms_warranty: e.target.value }))} className="accent-blue-600" />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <button type="submit" className="bg-blue-600 text-white px-10 py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition">Save Invoice</button>
              <button type="button" onClick={() => { setOpen(false); resetForm(); }} className="bg-gray-200 text-gray-600 px-10 py-2.5 rounded-lg hover:bg-gray-300 font-bold transition">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      {/* Mail Modal */}
      <div className={`overlay ${mailOpen ? "show" : ""} flex justify-center items-center`}>
        <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-lg p-8 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Mail size={20} /> Send Estimation</h2>
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
            <button onClick={handleSendEmail} disabled={mailSending} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow transition disabled:opacity-60">
              {mailSending ? "Sending..." : "Send Email"}
            </button>
            <button onClick={() => setMailOpen(false)} className="bg-gray-200 text-gray-600 px-8 py-2.5 rounded-lg hover:bg-gray-300 font-bold transition">Cancel</button>
          </div>
        </div>
      </div>

      {/* Invoice Preview */}
      {viewId && (
        <div key={viewId} ref={invoiceRef} className={`invoicewrapper w-full mt-6 bg-white shadow-xl p-6 relative overflow-y-auto ${showinvoice ? "See" : ""}`}>
          <div className="flex gap-3 absolute right-6 top-6 z-10">
            <X className="cursor-pointer text-gray-400 hover:text-red-500 bg-white rounded-full p-1" onClick={() => { setShowInvoice(false); setTimeout(() => setViewId(null), 400); }} />
          </div>
          <Invoice estimateInvoiceId={viewId} />
        </div>
      )}
    </div>
  );
};

export default EstimateInvoice;
