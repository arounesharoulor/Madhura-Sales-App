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
      address, city, state, pincode, latitude, longitude,
      notes, followUpDate, clientRequirement,
      projectName, services, softwareDetails
    } = req.body;

    if (!businessName || !businessType || !ownerName || !phone || !address || !city || !state || !pincode) {
      res.status(400);
      throw new Error('Please provide all required fields: Business Name, Business Type, Owner Name, Phone, Address, State, City, Pincode.');
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
        state,
        pincode,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      },
      notes: notes || '',
      clientRequirement: clientRequirement || '',
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      projectName,
      services,
      softwareDetails,
    });

    if (followUpDate) {
      try {
        await require('../models/FollowUp').create({
          executive: req.user.id,
          clientName: ownerName,
          companyName: businessName,
          notes: notes || `Follow-up for newly onboarded client: ${businessName}`,
          followUpDate: new Date(followUpDate),
          status: 'Pending',
          priority: 'Medium'
        });
      } catch (err) {
        console.error('Failed to create followup:', err);
      }
    }

    if (projectName) {
      try {
        await require('../models/Project').create({
          name: projectName,
          client: onboarding._id,
          services: services || [],
          clientRequirement: clientRequirement || '',
          softwareDetails: softwareDetails || ''
        });
      } catch (err) {
        console.error('Failed to create project:', err);
      }
    }

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
    // Removed filtering by executive ID so all employees can see all clients

    const onboardings = await ClientOnboarding.find(query)
      .populate('executive', 'name employeeId designation')
      .sort({ createdAt: -1 }).lean();

    res.status(200).json({ success: true, count: onboardings.length, data: onboardings });
  } catch (error) {
    next(error);
  }
};

// @desc    Update onboarded client
// @route   PUT /api/onboarding/:id
// @access  Private
exports.updateClient = async (req, res, next) => {
  try {
    let onboarding = await ClientOnboarding.findById(req.params.id);
    if (!onboarding) {
      res.status(404);
      throw new Error('Client not found');
    }

    if (req.user.role !== 'Admin' && onboarding.executive?.toString() !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized to update this client');
    }

    const {
      businessName, businessType, gstNumber,
      ownerName, phone, email,
      address, city, state, pincode, latitude, longitude,
      notes, followUpDate, clientRequirement,
      projectName, services, softwareDetails
    } = req.body;

    onboarding.businessName = businessName || onboarding.businessName;
    onboarding.businessType = businessType || onboarding.businessType;
    onboarding.gstNumber = gstNumber !== undefined ? gstNumber : onboarding.gstNumber;
    onboarding.ownerName = ownerName || onboarding.ownerName;
    onboarding.phone = phone || onboarding.phone;
    onboarding.email = email !== undefined ? email : onboarding.email;
    onboarding.notes = notes !== undefined ? notes : onboarding.notes;
    onboarding.clientRequirement = clientRequirement !== undefined ? clientRequirement : onboarding.clientRequirement;
    onboarding.projectName = projectName !== undefined ? projectName : onboarding.projectName;
    onboarding.services = services !== undefined ? services : onboarding.services;
    onboarding.softwareDetails = softwareDetails !== undefined ? softwareDetails : onboarding.softwareDetails;
    if (followUpDate) onboarding.followUpDate = new Date(followUpDate);

    if (address || city || state || pincode || latitude || longitude) {
      onboarding.location = {
        address: address || onboarding.location.address,
        city: city || onboarding.location.city,
        state: state || onboarding.location.state,
        pincode: pincode || onboarding.location.pincode,
        latitude: latitude ? Number(latitude) : onboarding.location.latitude,
        longitude: longitude ? Number(longitude) : onboarding.location.longitude,
      };
    }

    await onboarding.save();

    res.status(200).json({ success: true, data: onboarding });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete onboarded client
// @route   DELETE /api/onboarding/:id
// @access  Private
exports.deleteClient = async (req, res, next) => {
  try {
    const onboarding = await ClientOnboarding.findById(req.params.id);
    if (!onboarding) {
      res.status(404);
      throw new Error('Client not found');
    }

    if (req.user.role !== 'Admin' && onboarding.executive?.toString() !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized to delete this client');
    }

    await onboarding.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
