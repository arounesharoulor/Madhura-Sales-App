import React, { useState, useEffect, useRef } from "react";
import AppLayout from "../components/AppLayout";
import { Plus, Search, Download, X, Edit2, Trash2, Mail, RefreshCw, Eye } from "lucide-react";
import api from "../services/api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReceiptTemplate from "../components/receipttemplate.web";

const PAYMENT_METHODS = ["GOOGLE PAY", "PHONEPE", "BANK TRANSFER", "CASH", "CHEQUE"];

export default function PaymentReceiptScreenWeb() {
  const [role, setRole] = useState("Field Executive");
  const [receipts, setReceipts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [receiptNo, setReceiptNo] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [serviceNo, setServiceNo] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("GOOGLE PAY");

  // Bank Details
  const [accountName, setAccountName] = useState("Madhura Technologies Private Limited");
  const [accountType, setAccountType] = useState("Current Account");
  const [bankName, setBankName] = useState("Axis Bank, Aruppukottai");
  const [accountNumber, setAccountNumber] = useState("925020029656189");
  const [ifscCode, setIfscCode] = useState("UTIB0002029");

  // Client Details
  const [clientCompany, setClientCompany] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  // Items
  const [items, setItems] = useState([{ sl_no: 1, service_name: "", total_amount: 0, advance_amount: 0, received_amount: 0 }]);

  const downloadPDFRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) setRole(JSON.parse(stored).role);
      fetchReceipts();
      fetchInvoices();
    };
    load();
  }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/payment-receipts");
      setReceipts(res.data || []);
    } catch (err) {
      console.error("Fetch receipts error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await api.get("/madhura-invoice");
      setInvoices(res.data || []);
    } catch (err) {
      console.error("Fetch invoices error:", err);
    }
  };

  const handleSelectInvoice = async (invId) => {
    if (!invId) return;
    setInvoiceId(invId);
    try {
      const res = await api.get(`/madhura-invoice/${invId}`);
      const rows = res.data;
      if (rows && rows.length > 0) {
        const h = rows[0]; // Header details
        setInvoiceNo(h.invoice_no || "");
        setServiceNo(h.service_no || "");
        setClientCompany(h.client_company || "");
        setClientName(h.client_name || "");
        setClientAddress(h.client_address || "");

        // Map items from invoice to receipt
        const mappedItems = rows.map((r, i) => ({
          sl_no: i + 1,
          service_name: r.description || "Digital Marketing",
          total_amount: r.total_amount || 0,
          advance_amount: h.advance_amount || 0,
          received_amount: r.total_amount || 0
        }));
        setItems(mappedItems);
      }
    } catch (err) {
      console.error("Error loading invoice details:", err);
    }
  };

  const loadNextDetails = async () => {
    try {
      const res = await api.get("/payment-receipts/next-details");
      setReceiptNo(res.data.receipt_no);
      setReceiptDate(res.data.receipt_date);
      setPaymentDate(res.data.payment_date);
    } catch (err) {
      console.error(err);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setInvoiceId("");
    setInvoiceNo("");
    setServiceNo("");
    setClientCompany("");
    setClientName("");
    setClientAddress("");
    setItems([{ sl_no: 1, service_name: "", total_amount: 0, advance_amount: 0, received_amount: 0 }]);
    setPaymentMethod("GOOGLE PAY");
    setAccountName("Madhura Technologies Private Limited");
    setAccountType("Current Account");
    setBankName("Axis Bank, Aruppukottai");
    setAccountNumber("925020029656189");
    setIfscCode("UTIB0002029");
    loadNextDetails();
    setOpen(true);
  };

  const openEdit = async (id) => {
    setEditId(id);
    try {
      const res = await api.get(`/payment-receipts/${id}`);
      const r = res.data;
      setReceiptNo(r.receipt_no);
      setReceiptDate(r.receipt_date ? r.receipt_date.slice(0, 10) : "");
      setInvoiceId(r.invoice_id || "");
      setInvoiceNo(r.invoice_no);
      setServiceNo(r.service_no);
      setPaymentDate(r.payment_date ? r.payment_date.slice(0, 10) : "");
      setPaymentMethod(r.payment_method);
      setAccountName(r.account_name);
      setAccountType(r.account_type);
      setBankName(r.bank_name);
      setAccountNumber(r.account_number);
      setIfscCode(r.ifsc_code);
      setClientCompany(r.client_company);
      setClientName(r.client_name);
      setClientAddress(r.client_address);
      setItems(r.items || []);
      setOpen(true);
    } catch (err) {
      alert("Error loading receipt");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this receipt?")) return;
    try {
      await api.delete(`/payment-receipts/${id}`);
      fetchReceipts();
    } catch (err) {
      alert("Failed to delete receipt");
    }
  };

  const handleItemChange = (idx, field, value) => {
    const copy = [...items];
    copy[idx][field] = value;
    setItems(copy);
  };

  const addItemRow = () => {
    setItems(prev => [...prev, { sl_no: prev.length + 1, service_name: "", total_amount: 0, advance_amount: 0, received_amount: 0 }]);
  };

  const removeItemRow = () => {
    if (items.length <= 1) return;
    setItems(prev => prev.slice(0, -1));
  };

  // Calculate total received amount
  const calculateTotalReceived = () => {
    return items.reduce((sum, item) => sum + Number(item.received_amount || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      receipt_no: receiptNo,
      receipt_date: receiptDate,
      invoice_id: invoiceId || null,
      invoice_no: invoiceNo,
      service_no: serviceNo,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      account_name: accountName,
      account_type: accountType,
      bank_name: bankName,
      account_number: accountNumber,
      ifsc_code: ifscCode,
      client_company: clientCompany,
      client_name: clientName,
      client_address: clientAddress,
      items,
      total_amount: calculateTotalReceived()
    };

    try {
      if (editId) {
        await api.put(`/payment-receipts/${editId}`, payload);
      } else {
        await api.post("/payment-receipts/create", payload);
      }
      setOpen(false);
      fetchReceipts();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save payment receipt");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPDF = async () => {
    const el = document.getElementById("receipt-pdf-content");
    if (!el) return alert("Receipt content not ready");
    const filename = `Receipt_${receiptNo.replace(/\//g, "-")}.pdf`;

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
      height: 1123,
      windowWidth: 794,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, 210, 297);
    pdf.save(filename);
  };

  const filteredReceipts = receipts.filter(r => 
    r.receipt_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.client_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout currentScreen="PaymentReceipt" role={role}>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header Dashboard section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              Payment Receipts
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage and generate official payment receipt documents.</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition duration-150 ease-in-out"
          >
            <Plus size={18} /> Create Receipt
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by receipt no, client company, or invoice no..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white text-sm transition"
            />
          </div>
          <button onClick={fetchReceipts} className="p-2.5 text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-gray-100 rounded-xl border transition">
            <RefreshCw size={18} />
          </button>
        </div>

        {/* List Grid view */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-500 shadow-sm">
            No payment receipts found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReceipts.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="font-bold text-gray-900 text-base">{r.receipt_no}</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded">
                      {new Date(r.receipt_date).toLocaleDateString("en-IN")}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-800 text-md mb-2">{r.client_company || r.client_name}</h3>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div><span className="font-medium text-gray-400">Invoice:</span> {r.invoice_no}</div>
                    <div><span className="font-medium text-gray-400">Service:</span> {r.service_no}</div>
                    <div><span className="font-medium text-gray-400">Paid via:</span> {r.payment_method}</div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="text-lg font-black text-emerald-600">
                    ₹{Number(r.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setViewId(r.id); setReceiptNo(r.receipt_no); setShowReceipt(true); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="View Template"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => openEdit(r.id)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Form Modal ── */}
        {open && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-center items-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">
                  {editId ? "Edit Payment Receipt" : "Create New Payment Receipt"}
                </h2>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Autocomplete / Quick Fill section */}
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                  <label className="block text-xs font-bold text-blue-700 uppercase mb-2">
                    Quick Fill from Tax Invoice
                  </label>
                  <select
                    value={invoiceId}
                    onChange={e => handleSelectInvoice(e.target.value)}
                    className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 outline-none text-sm text-gray-800"
                  >
                    <option value="">-- Choose Tax Invoice to populate fields --</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_no} ({inv.client_company})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Receipt No *</label>
                    <input type="text" required value={receiptNo} onChange={e => setReceiptNo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Receipt Date *</label>
                    <input type="date" required value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500">
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Invoice No *</label>
                    <input type="text" required value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service No *</label>
                    <input type="text" required value={serviceNo} onChange={e => setServiceNo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Date *</label>
                    <input type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                  </div>
                </div>

                {/* Billed To */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Client Details (Billed To)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company Name</label>
                      <input type="text" value={clientCompany} onChange={e => setClientCompany(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Name</label>
                      <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                    <textarea rows="2" value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                  </div>
                </div>

                {/* Bank Details */}
                <div className="border-t pt-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Company Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Name</label>
                      <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Type</label>
                      <input type="text" value={accountType} onChange={e => setAccountType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bank Name</label>
                      <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Number</label>
                      <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">IFSC Code</label>
                      <input type="text" value={ifscCode} onChange={e => setIfscCode(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-gray-900">Services Details</h3>
                    <div className="flex gap-2">
                      <button type="button" onClick={removeItemRow} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2.5 py-1 rounded border border-red-200">Remove Row</button>
                      <button type="button" onClick={addItemRow} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-2.5 py-1 rounded border border-blue-200">Add Row</button>
                    </div>
                  </div>

                  <div className="overflow-x-auto border rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 font-bold text-gray-600 text-xs">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-12">S.No</th>
                          <th className="px-4 py-2.5 text-left">Service / Description</th>
                          <th className="px-4 py-2.5 text-right w-36">Total Amount (₹)</th>
                          <th className="px-4 py-2.5 text-right w-36">Advance (₹)</th>
                          <th className="px-4 py-2.5 text-right w-36">Received (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-center font-bold text-gray-500">{idx + 1}</td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                required
                                value={item.service_name}
                                onChange={e => handleItemChange(idx, "service_name", e.target.value)}
                                className="w-full bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none py-1"
                                placeholder="Service Description..."
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                required
                                value={item.total_amount}
                                onChange={e => handleItemChange(idx, "total_amount", Number(e.target.value))}
                                className="w-full bg-transparent text-right border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none py-1"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                required
                                value={item.advance_amount}
                                onChange={e => handleItemChange(idx, "advance_amount", Number(e.target.value))}
                                className="w-full bg-transparent text-right border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none py-1"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                required
                                value={item.received_amount}
                                onChange={e => handleItemChange(idx, "received_amount", Number(e.target.value))}
                                className="w-full bg-transparent text-right border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none py-1 font-bold text-emerald-600"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Total Received Row */}
                  <div className="flex justify-end mt-4">
                    <div className="text-right">
                      <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Total Received</span>
                      <span className="text-xl font-black text-emerald-600">
                        ₹{calculateTotalReceived().toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t flex-shrink-0">
                  <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-250 text-gray-700 font-bold rounded-xl transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50">
                    {submitting ? "Saving..." : "Save & Close"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Receipt Preview Modal ── */}
        {showReceipt && (
          <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-gray-100 flex-shrink-0 bg-gray-50">
                <h3 className="text-lg font-bold text-gray-800">Receipt Print View</h3>
                <div className="flex items-center gap-3">
                  <button onClick={downloadPDF} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-3 rounded flex items-center gap-1.5 text-sm shadow">
                    <Download size={14} /> Download PDF
                  </button>
                  <button onClick={() => { setShowReceipt(false); setViewId(null); }} className="text-gray-400 hover:text-red-500">
                    <X size={20} />
                  </button>
                </div>
              </div>
              {/* Scrollable preview */}
              <div className="overflow-y-auto bg-gray-200 p-6 flex justify-center">
                <div id="receipt-pdf-content" style={{ width: "794px", minHeight: "1123px", display: "block", backgroundColor: "#fff" }}>
                  <ReceiptTemplate receiptId={viewId} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
