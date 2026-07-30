const Client = require('../models/Client');
const Customer = require('../models/Customer');
const ClientOnboarding = require('../models/ClientOnboarding');

exports.searchClients = async (req, res, next) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(200).json([]);
    }

    const regex = new RegExp(name, 'i');
    
    const clients = await Client.find({
      $or: [
        { name: regex },
        { company_name: regex },
        { phone: regex },
        { email: regex }
      ]
    }).limit(10).lean();

    const customers = await Customer.find({
      $or: [
        { customer_name: regex },
        { mobile_number: regex },
        { email: regex },
        { location_city: regex }
      ]
    }).limit(10).lean();

    const onboardings = await ClientOnboarding.find({
      $or: [
        { ownerName: regex },
        { businessName: regex },
        { phone: regex },
        { email: regex }
      ]
    }).limit(10).lean();

    const results = [];
    const seen = new Set();

    clients.forEach(c => {
      const key = `${c.name}-${c.phone}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          id: c._id,
          name: c.name,
          company_name: c.company_name,
          email: c.email,
          phone: c.phone,
          address1: c.address1 || '',
          address2: c.address2 || '',
          city: c.city || '',
          state: c.state || '',
          pincode: c.pincode || '',
          gstin: c.gstin || ''
        });
      }
    });

    customers.forEach(c => {
      const key = `${c.customer_name}-${c.mobile_number}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          id: c._id,
          name: c.customer_name,
          company_name: '',
          email: c.email,
          phone: c.mobile_number,
          city: c.location_city || '',
          address1: '',
          address2: '',
          state: '',
          pincode: '',
          gstin: ''
        });
      }
    });

    onboardings.forEach(c => {
      const key = `${c.ownerName}-${c.phone}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          id: c._id,
          name: c.ownerName,
          company_name: c.businessName || '',
          email: c.email || '',
          phone: c.phone,
          address1: c.location?.address || '',
          address2: '',
          city: c.location?.city || '',
          state: c.location?.state || '',
          pincode: c.location?.pincode || '',
          gstin: c.gstNumber || ''
        });
      }
    });

    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
};