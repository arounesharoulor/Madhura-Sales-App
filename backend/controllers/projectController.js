const Project = require('../models/Project');
exports.getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find().populate('client', 'businessName ownerName').sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (error) { next(error); }
};
