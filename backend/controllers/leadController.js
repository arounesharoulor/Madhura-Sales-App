const Lead = require('../models/Lead');

const createLead = async (req, res) => {
  try {
    const lead = new Lead({ ...req.body, createdBy: req.user?._id });
    await lead.save();
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find().populate('assignedTo', 'name email').populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: leads });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateLeadStatus = async (req, res) => {
  try {
    const { status, meetingType } = req.body;
    const updateData = { status };
    if (meetingType) updateData.meetingType = meetingType;

    const lead = await Lead.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { createLead, getLeads, updateLeadStatus };
