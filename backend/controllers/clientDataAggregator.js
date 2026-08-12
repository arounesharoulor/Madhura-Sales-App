const mongoose = require('mongoose');
const CrmQuotation = require('../models/CrmQuotation');
const ProformaInvoice = require('../models/ProformaInvoice');
const TaxInvoice = require('../models/TaxInvoice');
const PaymentReceipt = require('../models/PaymentReceipt');

exports.getClientAggregatedData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyName } = req.query;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Valid Client ID is required' });
    }

    // Since a client can originate from Client, Customer, or ClientOnboarding,
    // and CrmQuotation / ProformaInvoice use customer_id while TaxInvoice uses client_id,
    // we query using the same id.
    const quotations = await CrmQuotation.find({ customer_id: id }).lean();
    const proformaInvoices = await ProformaInvoice.find({ customer_id: id }).lean();
    const taxInvoices = await TaxInvoice.find({ client_id: id }).lean();

    const taxInvoiceIds = taxInvoices.map(inv => inv._id);
    const taxInvoiceNos = taxInvoices.map(inv => inv.invoice_no);

    // Payment receipts might be linked by invoice_id, or simply have the client_company text matched
    const receiptQuery = {
      $or: [
        { invoice_id: { $in: taxInvoiceIds } },
        { invoice_no: { $in: taxInvoiceNos } }
      ]
    };

    if (companyName && companyName.trim() !== '') {
      receiptQuery.$or.push({ client_company: new RegExp(`^${companyName}$`, 'i') });
    }

    // If there are no tax invoices and no companyName passed, ensure we don't fetch all receipts
    // Only fetch receipts if we have valid conditions
    let paymentReceipts = [];
    if (taxInvoiceIds.length > 0 || (companyName && companyName.trim() !== '')) {
      paymentReceipts = await PaymentReceipt.find(receiptQuery).lean();
    }

    res.status(200).json({
      success: true,
      data: {
        quotations,
        proformaInvoices,
        taxInvoices,
        paymentReceipts
      }
    });
  } catch (error) {
    next(error);
  }
};
