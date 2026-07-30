import React from "react";
import { PlusCircle, MinusCircle, X } from "lucide-react";
import { calculateItemTotal, calculateTotals } from "../utils/invoicecal";
import api from "../api/api";

const UOM_OPTIONS = ["Nos", "Units", "Pieces", "Boxes", "Sets", "Meters", "Kg", "Liters"];
const TAX_OPTIONS = [{ value: "GST18", label: "GST 18%" }, { value: "GST5", label: "GST 5%" }, { value: "CUSTOM", label: "Custom GST" }];
const PAYMENT_OPTIONS = ["100% Advance", "Payment Against Delivery", "15 Days", "30 Days", "45 Days", "Custom"];
const WARRANTY_OPTIONS = ["No Warranty", "Testing Warranty", "1 Month", "3 Months", "6 Months", "12 Months", "24 Months", "36 Months", "OEM Warranty", "Supplier Warranty", "OEM Hardware Warranty", "No Software Warranty"];

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-5">
      <div className="h-1 w-5 bg-blue-500 rounded" />
      <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide">{children}</h3>
      <div className="flex-1 h-px bg-blue-100" />
    </div>
  );
}

export default function InvoiceFormModal({
  open, editId, title, prefix, dateLabel,
  extra, setExtra,
  clients, clientSearch, clientDropdown,
  handleClientSearch, handleSelectClient,
  customer, setCustomer,
  invoiceDate, setInvoiceDate,
  items, updateItem, addItem, removeItem,
  proposals, showProposalFill,
  handleSubmit, resetForm,
}) {
  const taxRate = extra.tax_type === "GST5" ? 5 : extra.tax_type === "CUSTOM" ? (Number(extra.custom_tax) || 0) : 18;
  const totals = calculateTotals(items.map(i => ({ ...i, tax: taxRate })));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex justify-center items-start overflow-y-auto pt-6 pb-10">
      <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-5xl p-7 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">{editId ? `Edit ${title}` : `Create ${title}`}</h2>
          <X className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => { resetForm(); }} />
        </div>

        {showProposalFill && proposals.length > 0 && (
          <div className="mb-4 bg-blue-50 p-3 rounded-lg flex items-center gap-3 border border-blue-100">
            <span className="text-sm font-semibold text-blue-800">Quick Fill from Quotation:</span>
            <select onChange={async e => {
              if (!e.target.value) return;
              const res = await api.get(`/crm-quotations/${e.target.value}`);
              const rows = res.data; 
              if (rows && rows.length > 0) {
                const h = rows[0];
                setCustomer({ 
                  customer_name: h.customer_name, 
                  mobile_number: h.mobile_number, 
                  email: h.email, 
                  location_city: h.location_city 
                });
                setExtra(ex => ({
                  ...ex,
                  client_company: h.client_company || '',
                  client_address1: h.client_address1 || '',
                  client_address2: h.client_address2 || '',
                  client_city: h.client_city || '',
                  client_state: h.client_state || '',
                  client_pincode: h.client_pincode || '',
                }));
              }
            }} className="bg-white border text-sm rounded-md px-3 py-1.5 outline-none flex-1 max-w-xs">
              <option value="">Select a Quotation</option>
              {proposals.map(q => <option key={q.id} value={q.id}>{q.customer_name} (#{String(q.id).slice(-6)})</option>)}
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">

          <SectionTitle>Client Details</SectionTitle>
          <div className="relative mb-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Select Existing Client</label>
            <div className="flex gap-2 mt-1">
              <input type="text" value={clientSearch} onChange={e => handleClientSearch(e.target.value)} placeholder="Search by name or company..." className="border rounded-lg px-3 py-2 outline-none text-sm flex-1" />
              {clientSearch && <button type="button" onClick={() => handleClientSearch("")} className="text-gray-400 hover:text-red-500"><X size={16} /></button>}
            </div>
            {clientDropdown.length > 0 && (
              <div className="absolute z-20 bg-white border shadow-lg rounded-lg mt-1 w-full max-h-48 overflow-y-auto">
                {clientDropdown.map(c => (
                  <div key={c.id} onClick={() => handleSelectClient(c)} className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0">
                    <span className="font-semibold">{c.company_name || c.name}</span>
                    {c.phone && <span className="text-gray-400 ml-2 text-xs">&#128222; {c.phone}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Reference No</label><input type="text" value="Auto-generated" readOnly className="border rounded-lg px-3 py-2 outline-none bg-gray-50 text-gray-400 text-sm cursor-not-allowed" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Company Name</label><input type="text" value={extra.client_company} onChange={e => setExtra(ex => ({ ...ex, client_company: e.target.value }))} placeholder="e.g. ABC Technologies" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Customer Name *</label><input type="text" value={customer.customer_name} onChange={e => { if (!/[0-9]/.test(e.nativeEvent.data)) setCustomer({ ...customer, customer_name: e.target.value }); }} placeholder="e.g. Ravi Kumar" className="border rounded-lg px-3 py-2 outline-none text-sm" required /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Mobile *</label><input type="text" value={customer.mobile_number} onChange={e => { if (/^\d{0,13}$/.test(e.target.value)) setCustomer({ ...customer, mobile_number: e.target.value }); }} maxLength={13} inputMode="numeric" className="border rounded-lg px-3 py-2 outline-none text-sm" required /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input type="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Address Line 1</label><input type="text" value={extra.client_address1} onChange={e => setExtra(ex => ({ ...ex, client_address1: e.target.value }))} placeholder="Street / Building" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Address Line 2</label><input type="text" value={extra.client_address2} onChange={e => setExtra(ex => ({ ...ex, client_address2: e.target.value }))} placeholder="Area / Landmark" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">City</label><input type="text" value={extra.client_city} onChange={e => setExtra(ex => ({ ...ex, client_city: e.target.value }))} placeholder="e.g. Chennai" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">State</label><input type="text" value={extra.client_state} onChange={e => setExtra(ex => ({ ...ex, client_state: e.target.value }))} placeholder="e.g. Tamil Nadu" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">PIN Code</label><input type="text" value={extra.client_pincode} onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setExtra(ex => ({ ...ex, client_pincode: e.target.value })); }} maxLength={6} inputMode="numeric" placeholder="e.g. 600001" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Country</label><input type="text" value={extra.client_country} readOnly className="border rounded-lg px-3 py-2 outline-none bg-gray-50 text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">{dateLabel} *</label><input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="border rounded-lg px-3 py-2 outline-none text-sm" required /></div>
          </div>

          <SectionTitle>Tax Configuration</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TAX_OPTIONS.map(opt => (
              <label key={opt.value} className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition ${extra.tax_type === opt.value ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                <input type="radio" name={`tax_type_${prefix}`} value={opt.value} checked={extra.tax_type === opt.value} onChange={e => setExtra(ex => ({ ...ex, tax_type: e.target.value }))} className="accent-blue-600" />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
          {extra.tax_type === "CUSTOM" && (
            <div className="flex flex-col gap-1 max-w-xs"><label className="text-xs font-bold text-gray-500 uppercase">Custom GST %</label><input type="number" value={extra.custom_tax} onChange={e => setExtra(ex => ({ ...ex, custom_tax: e.target.value }))} placeholder="e.g. 12" min="0" max="100" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
          )}

          <SectionTitle>Quote Items</SectionTitle>
          <div className="border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-center text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b">
                <tr className="text-gray-600 font-bold uppercase text-[10px]">
                  <th className="px-3 py-2">S.No</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-left">Brand &amp; Model</th>
                  <th className="px-3 py-2">UOM</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2 text-gray-400">Tax %</th><th className="px-3 py-2">Disc</th><th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-2 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-2 py-2"><input type="text" value={item.name} onChange={e => updateItem(i, "name", e.target.value)} className="w-full outline-none bg-transparent text-sm" placeholder="Description" /></td>
                    <td className="px-2 py-2"><input type="text" value={item.brand_model} onChange={e => updateItem(i, "brand_model", e.target.value)} className="w-full outline-none bg-transparent text-sm" placeholder="Brand/Model" /></td>
                    <td className="px-2 py-2">
                      <select value={UOM_OPTIONS.includes(item.uom) ? item.uom : "custom"} onChange={e => updateItem(i, "uom", e.target.value)} className="border rounded px-2 py-1 text-xs outline-none bg-white">
                        {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                        <option value="custom">Custom</option>
                      </select>
                      {!UOM_OPTIONS.includes(item.uom) && <input type="text" value={item.uom} onChange={e => updateItem(i, "uom", e.target.value)} placeholder="Enter UOM" className="mt-1 border rounded px-2 py-1 text-xs w-full outline-none" />}
                    </td>
                    <td className="px-2 py-2"><input type="number" value={item.price} onChange={e => updateItem(i, "price", Number(e.target.value))} className="w-20 text-center outline-none bg-transparent text-sm" /></td>
                    <td className="px-2 py-2"><input type="number" value={item.qty} onChange={e => updateItem(i, "qty", Number(e.target.value))} className="w-12 text-center outline-none bg-transparent text-sm" /></td>
                    <td className="px-2 py-2"><input type="number" value={taxRate} readOnly className="w-12 text-center text-gray-400 bg-transparent outline-none cursor-not-allowed text-sm" /></td>
                    <td className="px-2 py-2"><input type="number" value={item.discount} onChange={e => updateItem(i, "discount", Number(e.target.value))} className="w-16 text-center outline-none bg-transparent text-sm" /></td>
                    <td className="px-2 py-2 text-right font-bold text-sm">&#8377;{calculateItemTotal({ ...item, tax: taxRate }).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-gray-50 p-3 flex gap-4">
              <button type="button" onClick={addItem} className="flex items-center gap-1 text-blue-600 font-bold text-xs hover:underline"><PlusCircle size={13} /> Add Line</button>
              <button type="button" onClick={removeItem} className="flex items-center gap-1 text-red-500 font-bold text-xs hover:underline"><MinusCircle size={13} /> Remove Line</button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>&#8377;{totals.subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>Discount</span><span>-&#8377;{totals.total_discount.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>CGST ({taxRate/2}%)</span><span>&#8377;{totals.total_cgst.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>SGST ({taxRate/2}%)</span><span>&#8377;{totals.total_sgst.toLocaleString()}</span></div>
              <div className="flex justify-between font-bold text-base text-gray-800 border-t pt-2"><span>Grand Total</span><span>&#8377;{totals.grand_total.toLocaleString()}</span></div>
            </div>
          </div>

          <SectionTitle>Assigned Executive &amp; Conditions</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Executive Name</label><input type="text" value={extra.exec_name} onChange={e => setExtra(ex => ({ ...ex, exec_name: e.target.value }))} placeholder="e.g. Anand" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Executive Phone</label><input type="text" value={extra.exec_phone} onChange={e => setExtra(ex => ({ ...ex, exec_phone: e.target.value }))} placeholder="e.g. 9876543210" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Executive Email</label><input type="email" value={extra.exec_email} onChange={e => setExtra(ex => ({ ...ex, exec_email: e.target.value }))} placeholder="e.g. exec@madhuratech.com" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
          </div>

          <SectionTitle>Terms &amp; Policies</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer"><input type="checkbox" checked={extra.terms_general} onChange={e => setExtra(ex => ({ ...ex, terms_general: e.target.checked }))} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" /> General Terms &amp; Conditions apply</label>
              <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer"><input type="checkbox" checked={extra.terms_tax} onChange={e => setExtra(ex => ({ ...ex, terms_tax: e.target.checked }))} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" /> Prices exclude Sales &amp; Service Tax</label>
              <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer"><input type="checkbox" checked={extra.terms_validity} onChange={e => setExtra(ex => ({ ...ex, terms_validity: e.target.checked }))} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" /> Quote valid for 15 days</label>
            </div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Project Duration</label><input type="text" value={extra.terms_project_period} onChange={e => setExtra(ex => ({ ...ex, terms_project_period: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
          </div>

          <div className="flex flex-col gap-1.5 mt-3">
            <label className="text-xs font-bold text-gray-500 uppercase">Separate Material/Service Orders Required?</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer"><input type="checkbox" checked={extra.terms_separate_orders.material} onChange={e => setExtra(ex => ({ ...ex, terms_separate_orders: { ...ex.terms_separate_orders, material: e.target.checked } }))} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" /> Material Supply</label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer"><input type="checkbox" checked={extra.terms_separate_orders.installation} onChange={e => setExtra(ex => ({ ...ex, terms_separate_orders: { ...ex.terms_separate_orders, installation: e.target.checked } }))} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" /> Installation / Service</label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer"><input type="checkbox" checked={extra.terms_separate_orders.usd} onChange={e => setExtra(ex => ({ ...ex, terms_separate_orders: { ...ex.terms_separate_orders, usd: e.target.checked } }))} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" /> Subject to USD Rates</label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer"><input type="checkbox" checked={extra.terms_separate_orders.boq} onChange={e => setExtra(ex => ({ ...ex, terms_separate_orders: { ...ex.terms_separate_orders, boq: e.target.checked } }))} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" /> Factory BOQ May Vary</label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Payment Terms</label>
              <select value={extra.terms_payment} onChange={e => setExtra(ex => ({ ...ex, terms_payment: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm bg-white">
                <option value="">Select Payment Option</option>
                {PAYMENT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {extra.terms_payment === "Custom" && <input type="text" value={extra.terms_payment_custom} onChange={e => setExtra(ex => ({ ...ex, terms_payment_custom: e.target.value }))} placeholder="Describe payment terms..." className="mt-1.5 border rounded-lg px-3 py-2 outline-none text-sm" />}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Warranty Info</label>
              <select value={extra.terms_warranty} onChange={e => setExtra(ex => ({ ...ex, terms_warranty: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm bg-white">
                <option value="">Select Warranty Option</option>
                {WARRANTY_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <button type="button" onClick={() => { resetForm(); }} className="border rounded-lg px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2.5 text-sm font-semibold shadow-md">Save Changes</button>
          </div>

        </form>
      </div>
    </div>
  );
}
