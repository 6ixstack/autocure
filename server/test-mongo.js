const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    console.log('🔗 Testing MongoDB Atlas connection...');
    console.log('📡 Connection URI (masked):', uri.replace(/\/\/.*@/, '//***:***@'));
    
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
    
    // Test creating a document in the autocure database
    const db = client.db("autocure");
    const testCollection = db.collection("test");
    
    const testDoc = { 
      message: "Hello AutoCure!", 
      timestamp: new Date(),
      test: true
    };
    
    await testCollection.insertOne(testDoc);
    console.log("✅ Successfully inserted test document!");
    
    // Clean up test document
    await testCollection.deleteOne({ test: true });
    console.log("✅ Cleaned up test document!");
    
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('\n💡 Authentication Tips:');
      console.log('1. Check your username and password in MongoDB Atlas');
      console.log('2. Make sure your IP address is whitelisted');
      console.log('3. Verify the database user has proper permissions');
    }
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

run().catch(console.dir);