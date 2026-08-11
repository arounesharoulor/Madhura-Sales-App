const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb+srv://arounesharoulor_db_user:Arounesh123@materialapp.t8wxpqk.mongodb.net/?appName=MaterialApp').then(async () => {
  const result = await User.updateMany({}, { $set: { activeSessionTokens: [] } });
  console.log('CLEARED SESSIONS:', result);
  process.exit(0);
});
