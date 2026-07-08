const Location = require('../models/Location');

// @desc    Record executive GPS location
// @route   POST /api/locations
// @access  Private/FieldExecutive
exports.recordLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, speed, heading, accuracy } = req.body;

    const newLocation = await Location.create({
      executive: req.user.id,
      latitude: Number(latitude),
      longitude: Number(longitude),
      speed: speed ? Number(speed) : 0,
      heading: heading ? Number(heading) : 0,
      accuracy: accuracy ? Number(accuracy) : 0,
      timestamp: Date.now(),
    });

    // Broadcast location update in real-time to sockets
    if (req.io) {
      req.io.emit('location_update', {
        executiveId: req.user.id,
        executiveName: req.user.name,
        latitude: Number(latitude),
        longitude: Number(longitude),
        timestamp: newLocation.timestamp,
      });
    }

    res.status(201).json({
      success: true,
      data: newLocation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get location history for a user
// @route   GET /api/locations/history/:userId
// @access  Private/Admin/Manager
exports.getLocationHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { start, end } = req.query;

    let query = { executive: userId };

    if (start && end) {
      query.timestamp = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    } else {
      // Default to last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      query.timestamp = { $gte: yesterday };
    }

    const history = await Location.find(query).sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get latest location of all active executives
// @route   GET /api/locations/latest
// @access  Private/Admin/Manager
exports.getLatestLocations = async (req, res, next) => {
  try {
    // Find all users who are Field Executives
    const User = require('../models/User');
    let userQuery = { role: 'Field Executive', isActive: true };

    if (req.user.role === 'Manager') {
      userQuery.manager = req.user.id;
    }

    const executives = await User.find(userQuery).select('name email phone employeeId designation isLiveLocationShared');
    const execIds = executives.map(e => e._id);

    // Get latest location for each
    const latestLocations = await Promise.all(
      execIds.map(async (id) => {
        const loc = await Location.findOne({ executive: id })
          .sort({ timestamp: -1 })
          .lean();
        
        const executiveInfo = executives.find(e => e._id.toString() === id.toString());

        if (loc) {
          return {
            ...loc,
            executiveName: executiveInfo.name,
            executiveEmail: executiveInfo.email,
            executivePhone: executiveInfo.phone,
            employeeId: executiveInfo.employeeId,
            designation: executiveInfo.designation,
            isLiveLocationShared: executiveInfo.isLiveLocationShared,
          };
        }
        return {
          executive: id,
          executiveName: executiveInfo.name,
          executiveEmail: executiveInfo.email,
          executivePhone: executiveInfo.phone,
          employeeId: executiveInfo.employeeId,
          designation: executiveInfo.designation,
          isLiveLocationShared: executiveInfo.isLiveLocationShared,
          latitude: null,
          longitude: null,
          timestamp: null,
        };
      })
    );

    // Filter out entries with no location tracking history yet (optional, let's keep them so the admin knows they are not online)
    res.status(200).json({
      success: true,
      data: latestLocations,
    });
  } catch (error) {
    next(error);
  }
};
