// Simple test script for the enhanced tutor agent
const { MongoClient } = require('mongodb');
const { callEnhancedTutorAgent } = require('./lib/agent/enhanced-tutor-agent.ts');

async function testEnhancedAgent() {
  console.log('🧪 Testing Enhanced Tutor Agent...');
  
  try {
    // Connect to MongoDB
    const client = new MongoClient(process.env.DATABASE_URL);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    // Test query
    const testQuery = "What is machine learning?";
    const threadId = "test-thread-" + Date.now();
    
    console.log('📝 Test Query:', testQuery);
    
    // Call the enhanced agent
    const response = await callEnhancedTutorAgent(
      client,
      testQuery,
      threadId,
      "CS-3010", // classId
      "ML-Intro", // lessonId
      "test-student", // studentId
      "beginner", // studentLevel
      "Introduction to ML", // currentTopic
      25 // progress
    );
    
    console.log('🤖 Agent Response:');
    console.log(response);
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close MongoDB connection
    if (client) {
      await client.close();
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEnhancedAgent();
}

module.exports = { testEnhancedAgent };
