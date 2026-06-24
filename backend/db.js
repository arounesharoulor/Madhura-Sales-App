const mongoose = require('mongoose');
const dns = require('dns');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/field_staff_db';

const DEFAULT_DNS_SERVERS = ['8.8.8.8', '1.1.1.1', '9.9.9.9'];

const initializeDns = () => {
  if (typeof dns.setServers === 'function') {
    try {
      dns.setServers(DEFAULT_DNS_SERVERS);
      console.log(`🌐 Using DNS servers: ${DEFAULT_DNS_SERVERS.join(', ')}`);
    } catch (e) {
      console.warn('⚠️ Could not set custom DNS servers:', e.message);
    }
  }
};

const connectDB = async (retries = 5, delay = 3000) => {
  initializeDns();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`❌ DB Connection attempt ${attempt}/${retries} failed: ${error.message}`);

      if (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED')) {
        console.error(
          '🔎 Atlas SRV resolve failed. This is often caused by DNS restrictions or network blocking.\n' +
          '   If you are behind a restrictive network, try using a different DNS / network.\n' +
          '   Confirm your MongoDB Atlas cluster is reachable and your IP is whitelisted.'
        );
      }

      if (error.message.includes('whitelist') || error.message.includes('IP')) {
        console.error(
          '🔒 IP not whitelisted in MongoDB Atlas.\n' +
          '   Go to: https://cloud.mongodb.com → Security → Network Access\n' +
          '   Add your current IP address, or allow access from anywhere for testing.'
        );
      }

      if (attempt < retries) {
        console.log(`   Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 15000); // exponential backoff, max 15s
      } else {
        console.error('⚠️  Could not connect to MongoDB after all retries. Server continues without DB.');
      }
    }
  }
};

module.exports = connectDB;
