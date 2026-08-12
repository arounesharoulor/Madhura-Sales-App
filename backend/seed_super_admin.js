const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });
const User = require('./models/User');

async function setupDivyaSuperAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Delete Dina accounts as requested
    const deletedDina = await User.deleteMany({ email: { $regex: /dina/i } });
    console.log(`🗑️ Removed ${deletedDina.deletedCount} Dina account(s) from database.`);

    const defaultPassword = 'password123'; // Standard default password

    // 2. Setup Divya (divyamadhuratech@gmail.com) as Super Admin / MD
    let divya = await User.findOne({ email: 'divyamadhuratech@gmail.com' });
    if (divya) {
      divya.name = 'Divya';
      divya.role = 'Managing Director MD';
      divya.designation = 'Managing Director MD';
      divya.companyId = 'company_madhura';
      divya.isActive = true;
      divya.isApproved = true;
      divya.isTenantSuspended = false;
      divya.password = defaultPassword; // Single-hashed by pre('save') hook
      await divya.save();
      console.log('✅ Updated Divya (divyamadhuratech@gmail.com) as Super Admin / Managing Director MD');
    } else {
      divya = await User.create({
        name: 'Divya',
        email: 'divyamadhuratech@gmail.com',
        password: defaultPassword,
        role: 'Managing Director MD',
        designation: 'Managing Director MD',
        companyId: 'company_madhura',
        phone: '9876567432',
        isActive: true,
        isApproved: true,
        isTenantSuspended: false
      });
      console.log('✅ Created Divya (divyamadhuratech@gmail.com) as Super Admin / Managing Director MD');
    }

    // 3. Group all remaining users under company_madhura (Divya's company)
    const updateResult = await User.updateMany(
      { companyId: { $in: ['company_madhura', '', null] } },
      { 
        $set: { 
          companyId: 'company_madhura',
          isTenantSuspended: false,
          isApproved: true,
          isActive: true
        } 
      }
    );
    console.log(`✅ Grouped ${updateResult.modifiedCount} users under Divya (companyId: 'company_madhura')`);

    // Fetch list of all grouped users under Divya
    const groupedUsers = await User.find({ companyId: 'company_madhura' }).select('name email role designation');
    console.log(`\n📋 Total ${groupedUsers.length} users now grouped under Divya (MD):`);
    groupedUsers.forEach(u => {
      console.log(` - ${u.name} (${u.email || u.role}) | Role: ${u.role}`);
    });

    console.log('\n======================================================');
    console.log('🎉 Divya set as Super Admin / MD & Users Grouped Successfully!');
    console.log('Super Admin Email: divyamadhuratech@gmail.com');
    console.log('Default Password:  password123');
    console.log('Role:              Managing Director MD (Super Admin)');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }
}

setupDivyaSuperAdmin();
