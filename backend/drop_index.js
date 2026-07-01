require('dotenv').config();
const mongoose = require('mongoose');

async function dropIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
    
    // Access the raw collection
    const collection = mongoose.connection.db.collection('users');
    
    // Check if index exists and drop it
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name));
    
    if (indexes.find(i => i.name === 'employeeId_1')) {
      await collection.dropIndex('employeeId_1');
      console.log('Dropped employeeId_1 index successfully!');
    } else {
      console.log('Index employeeId_1 not found, nothing to drop.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

dropIndex();
