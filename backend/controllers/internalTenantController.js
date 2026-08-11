const User = require('../models/User');

exports.provisionTenant = async (req, res) => {
  try {
    const { companyId, companyName, adminUser } = req.body;
    
    // Check if admin already exists for this tenant
    const existingAdmin = await User.findOne({ email: adminUser.email });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Admin user already exists' });
    }

    // Create the tenant admin user
    const user = await User.create({
      companyId,
      name: adminUser.name,
      email: adminUser.email,
      password: adminUser.password || 'TemporaryPassword123!',
      role: 'Managing Director MD', // Tenant owner acts as Super Admin for their company
      isApproved: true,
      isActive: true,
    });

    res.status(201).json({ success: true, message: 'Tenant provisioned successfully', user: { id: user._id, email: user.email } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTenantStatus = async (req, res) => {
  try {
    const { companyId } = req.params;
    const userCount = await User.countDocuments({ companyId, isActive: true });
    
    res.json({
      success: true,
      companyId,
      userCount,
      // Since this is purely internal status tracking from CRM side
      crmEnabled: true,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.enableTenant = async (req, res) => {
  try {
    const { companyId } = req.params;
    await User.updateMany({ companyId }, { isTenantSuspended: false });
    res.json({ success: true, message: 'Tenant CRM enabled locally' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.disableTenant = async (req, res) => {
  try {
    const { companyId } = req.params;
    await User.updateMany({ companyId }, { isTenantSuspended: true });
    res.json({ success: true, message: 'Tenant CRM disabled locally' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
