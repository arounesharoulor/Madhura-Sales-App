const FromAddress = require('../models/FromAddress');

exports.getFromAddresses = async (req, res, next) => {
  try {
    const addresses = await FromAddress.find().sort({ _id: 1 }).lean();
    
    // Map to standard SQL result shape (id property mapping)
    const formatted = addresses.map(a => ({
      id: a._id,
      label: a.label,
      address: a.address,
      is_default: a.is_default ? 1 : 0
    }));
    
    res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

exports.createFromAddress = async (req, res, next) => {
  try {
    const { label, address } = req.body;
    if (!label || !address) {
      return res.status(400).json({ message: "Label and address required" });
    }
    const fromAddress = await FromAddress.create({ label, address });
    
    res.status(201).json({
      id: fromAddress._id,
      label: fromAddress.label,
      address: fromAddress.address
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteFromAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    await FromAddress.findByIdAndDelete(id);
    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    next(error);
  }
};
