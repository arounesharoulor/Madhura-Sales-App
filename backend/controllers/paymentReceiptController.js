const PaymentReceipt = require('../models/PaymentReceipt');
const TaxInvoice = require('../models/TaxInvoice');

// GET all receipts
exports.getReceipts = async (req, res, next) => {
  try {
    const receipts = await PaymentReceipt.find()
      .populate('invoice_id')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = receipts.map(r => ({
      id: r._id,
      receipt_no: r.receipt_no,
      receipt_date: r.receipt_date,
      invoice_no: r.invoice_no,
      service_no: r.service_no,
      payment_date: r.payment_date,
      payment_method: r.payment_method,
      client_company: r.client_company,
      client_name: r.client_name,
      total_amount: r.total_amount
    }));

    res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

// GET next details for receipt
exports.getNextReceiptDetails = async (req, res, next) => {
  try {
    const count = await PaymentReceipt.countDocuments();
    const nextNum = count + 1;
    const paddedNum = String(nextNum).padStart(3, '0');

    // Auto-generate receipt number like MT/REC/26-27/001
    const receipt_no = `MT/REC/26-27/${paddedNum}`;

    res.status(200).json({
      receipt_no,
      receipt_date: new Date().toISOString().slice(0, 10),
      payment_date: new Date().toISOString().slice(0, 10)
    });
  } catch (error) {
    next(error);
  }
};

// GET single receipt by ID
exports.getReceiptById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const r = await PaymentReceipt.findById(id).populate('invoice_id').lean();
    if (!r) {
      return res.status(404).json({ message: "Payment Receipt not found" });
    }

    res.status(200).json(r);
  } catch (error) {
    next(error);
  }
};

// CREATE a new receipt
exports.createReceipt = async (req, res, next) => {
  try {
    const {
      receipt_no,
      receipt_date,
      invoice_id,
      invoice_no,
      service_no,
      payment_date,
      payment_method,
      account_name,
      account_type,
      bank_name,
      account_number,
      ifsc_code,
      client_company,
      client_name,
      client_address,
      items,
      total_amount
    } = req.body;

    if (!receipt_no) return res.status(400).json({ message: "Receipt number is required" });
    if (!invoice_no) return res.status(400).json({ message: "Invoice number is required" });
    if (!total_amount && total_amount !== 0) return res.status(400).json({ message: "Total amount is required" });

    // Check unique receipt_no
    const existing = await PaymentReceipt.findOne({ receipt_no }).lean();
    if (existing) {
      return res.status(400).json({ message: "Receipt number already exists" });
    }

    const receipt = new PaymentReceipt({
      receipt_no,
      receipt_date,
      invoice_id: invoice_id || null,
      invoice_no,
      service_no,
      payment_date,
      payment_method,
      account_name,
      account_type,
      bank_name,
      account_number,
      ifsc_code,
      client_company,
      client_name,
      client_address,
      items,
      total_amount
    });

    await receipt.save();

    res.status(201).json({ message: "Payment Receipt created successfully", id: receipt._id });
  } catch (error) {
    next(error);
  }
};

// UPDATE receipt
exports.updateReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      receipt_no,
      receipt_date,
      invoice_id,
      invoice_no,
      service_no,
      payment_date,
      payment_method,
      account_name,
      account_type,
      bank_name,
      account_number,
      ifsc_code,
      client_company,
      client_name,
      client_address,
      items,
      total_amount
    } = req.body;

    const receipt = await PaymentReceipt.findById(id);
    if (!receipt) {
      return res.status(404).json({ message: "Payment Receipt not found" });
    }

    if (receipt_no && receipt_no !== receipt.receipt_no) {
      const existing = await PaymentReceipt.findOne({ receipt_no }).lean();
      if (existing) {
        return res.status(400).json({ message: "Receipt number already exists" });
      }
      receipt.receipt_no = receipt_no;
    }

    if (receipt_date) receipt.receipt_date = receipt_date;
    receipt.invoice_id = invoice_id || null;
    if (invoice_no) receipt.invoice_no = invoice_no;
    if (service_no) receipt.service_no = service_no;
    if (payment_date) receipt.payment_date = payment_date;
    if (payment_method) receipt.payment_method = payment_method;
    if (account_name) receipt.account_name = account_name;
    if (account_type) receipt.account_type = account_type;
    if (bank_name) receipt.bank_name = bank_name;
    if (account_number) receipt.account_number = account_number;
    if (ifsc_code) receipt.ifsc_code = ifsc_code;
    if (client_company) receipt.client_company = client_company;
    if (client_name) receipt.client_name = client_name;
    if (client_address) receipt.client_address = client_address;
    if (items) receipt.items = items;
    if (total_amount !== undefined) receipt.total_amount = total_amount;

    await receipt.save();

    res.status(200).json({ message: "Payment Receipt updated successfully" });
  } catch (error) {
    next(error);
  }
};

// DELETE receipt
exports.deleteReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await PaymentReceipt.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: "Payment Receipt not found" });
    }
    res.status(200).json({ message: "Payment Receipt deleted successfully" });
  } catch (error) {
    next(error);
  }
};
