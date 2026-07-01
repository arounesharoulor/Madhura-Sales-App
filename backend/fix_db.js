const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to DB...');
    
    // 1. Delete orphaned attendance records (no executive attached) which caused the 500 error in the old code
    const deleted = await Attendance.deleteMany({ executive: null });
    console.log(`Deleted ${deleted.deletedCount} orphaned attendance records.`);

    // 2. Fix stuck records: CheckInStatus was updated but status wasn't, or vice-versa
    const stuck = await Attendance.find({});
    let fixed = 0;
    for (const r of stuck) {
      let needsSave = false;
      
      // If server crashed halfway, reset it so it can be approved again
      if (r.checkInStatus === 'Approved' && r.status === 'Pending Check-In') {
        r.checkInStatus = 'Pending';
        needsSave = true;
      }
      if (r.checkOutStatus === 'Approved' && r.status === 'Pending Check-Out') {
        r.checkOutStatus = 'Pending';
        needsSave = true;
      }
      
      if (needsSave) {
        await r.save();
        fixed++;
      }
    }
    console.log(`Reset ${fixed} stuck attendance records back to Pending.`);
    
    console.log('Database cleanup complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
