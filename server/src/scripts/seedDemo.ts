import dotenv from 'dotenv';
import mongoose from 'mongoose';
import seedDemoData from '../seeders/demoData';

// Load environment variables
dotenv.config();

const seedDatabase = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autocure';
    await mongoose.connect(mongoUri);
    console.log('📊 Connected to MongoDB');

    // Seed demo data
    await seedDemoData();

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }
};

// Run the seeder
seedDatabase();