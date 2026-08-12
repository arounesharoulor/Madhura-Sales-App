const ClientOnboarding = require('../models/ClientOnboarding');
const { buildReportExcel } = require('../utils/excelBuilder');

exports.downloadClientReport = async (req, res, next) => {
  try {
    const client = await ClientOnboarding.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Create a dummy Report object for the excelBuilder
    const dummyReport = {
      title: `${client.businessName || client.companyName} - Client Profile`,
      type: 'Client Profile',
      startDate: client.onboardingDate || client.createdAt,
      endDate: new Date(),
      clientId: client._id,
      customClientName: client.businessName || client.companyName,
      customProjectName: client.projectName || '',
      customSummary: client.notes || '',
      summary: {},
      activities: []
    };

    const buffer = await buildReportExcel(dummyReport);
    
    // Fallback to name if businessName is absent
    const nameStr = (client.businessName || client.ownerName || 'client').replace(/\s+/g, '_');
    const filename = `profile_${nameStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
