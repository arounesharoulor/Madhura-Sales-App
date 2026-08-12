const mongoose = require('mongoose');
const path = require('path');
const dns = require('dns');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/field_staff_db';

const initializeDns = () => {
  if (typeof dns.setServers === 'function') {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '9.9.9.9']);
      console.log('🌐 Initialized DNS servers for Atlas connection');
    } catch (e) {
      console.warn('⚠️ Could not set custom DNS servers:', e.message);
    }
  }
};

async function run() {
  try {
    initializeDns();
    console.log('Connecting to database:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const collections = await mongoose.connection.db.collections();
    for (let col of collections) {
      const name = col.collectionName;
      if (name.includes('system.') || name === 'sessions') continue;

      // Update documents where companyId is missing or empty
      const result = await col.updateMany(
        { $or: [{ companyId: { $exists: false } }, { companyId: '' }, { companyId: null }] },
        { $set: { companyId: 'company_madhura' } }
      );
      console.log(`Collection "${name}": Updated ${result.modifiedCount} documents to set companyId.`);
    }

    console.log('Database migration successfully completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

run();
