const Quotation = require('../models/Quotation');
exports.getQuotations = async (req, res, next) => {
  try {
    const quotations = await Quotation.find().populate('project', 'name').sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, count: quotations.length, data: quotations });
  } catch (error) { next(error); }
};
exports.createQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.create(req.body);
    res.status(201).json({ success: true, data: quotation });
  } catch (error) { next(error); }
};
