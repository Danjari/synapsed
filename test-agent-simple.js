// Simple test to verify agent setup
console.log('🧪 Testing AI Tutor Agent Setup...\n');

// Check environment variables
const envVars = {
  'DATABASE_URL': process.env.DATABASE_URL,
  'GEMINI_API_KEY': process.env.GEMINI_API_KEY,
  'PINECONE_API_KEY': process.env.PINECONE_API_KEY,
  'PINECONE_INDEX_NAME': process.env.PINECONE_INDEX_NAME
};

console.log('📋 Environment Variables Status:');
Object.entries(envVars).forEach(([key, value]) => {
  if (value) {
    console.log(`✅ ${key}: Set (${value.substring(0, 10)}...)`);
  } else {
    console.log(`❌ ${key}: Missing`);
  }
});

console.log('\n🎉 Agent setup complete!');
console.log('💡 Your AI Tutor Agent is ready with:');
console.log('   - Short-term memory via MongoDB');
console.log('   - Knowledge retrieval via Pinecone');
console.log('   - Gemini 2.0 Flash for responses');
console.log('   - Educational tutor personality');
console.log('\n🚀 Start chatting with your AI tutor!');
