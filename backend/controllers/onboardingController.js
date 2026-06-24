const ClientOnboarding = require('../models/ClientOnboarding');
const Notification = require('../models/Notification');

// @desc    Onboard a new client
// @route   POST /api/onboarding
// @access  Private/FieldExecutive
exports.onboardClient = async (req, res, next) => {
  try {
    const {
      businessName, businessType, gstNumber,
      ownerName, phone, email,
      address, city, pincode, latitude, longitude,
      notes, followUpDate,
    } = req.body;

    if (!businessName || !businessType || !ownerName || !phone || !address || !city || !pincode) {
      res.status(400);
      throw new Error('Please provide all required fields: Business Name, Business Type, Owner Name, Phone, Address, City, Pincode.');
    }

    const onboarding = await ClientOnboarding.create({
      executive: req.user.id,
      businessName,
      businessType,
      gstNumber: gstNumber || '',
      ownerName,
      phone,
      email: email || '',
      location: {
        address,
        city,
        pincode,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      },
      notes: notes || '',
      followUpDate: followUpDate ? new Date(followUpDate) : null,
    });

    // Notify all admins in real-time
    const admins = await require('../models/User').find({ role: 'Admin', isActive: true }).select('_id');
    await Promise.all(
      admins.map(async (admin) => {
        const notif = await Notification.create({
          recipient: admin._id,
          sender: req.user.id,
          title: 'New Client Onboarded',
          message: `${req.user.name} onboarded "${businessName}" (${businessType}).`,
          type: 'Success',
        });
        if (req.io) req.io.to(admin._id.toString()).emit('notification', notif);
      })
    );

    res.status(201).json({ success: true, data: onboarding });
  } catch (error) {
    next(error);
  }
};

// @desc    Get onboarded clients
// @route   GET /api/onboarding
// @access  Private
exports.getOnboardedClients = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'Admin') {
      query.executive = req.user.id;
    }

    const onboardings = await ClientOnboarding.find(query)
      .populate('executive', 'name employeeId designation')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: onboardings.length, data: onboardings });
  } catch (error) {
    next(error);
  }
};
