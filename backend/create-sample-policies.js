// Simple script to create sample pending policies
// Run this with: node create-sample-policies.js

import mongoose from 'mongoose';
import PolicyProduct from './src/models/policyProduct.js';

// Connect to MongoDB
const MONGODB_URL = 'mongodb://localhost:27017/Insurance';

mongoose.connect(MONGODB_URL)
  .then(async () => {
    console.log("Connected to MongoDB");
    
    // Sample pending policies
    const samplePolicies = [
      {
        code: 'PEND001',
        title: 'Auto Insurance Pending',
        type: 'Vehicle',
        description: 'Comprehensive auto insurance pending approval',
        termMonths: 12,
        tenureMonths: 12,
        premium: 500,
        minSumInsured: 100000,
        status: 'pending'
      },
      {
        code: 'PEND002', 
        title: 'Health Insurance Pending',
        type: 'Health',
        description: 'Family health insurance pending approval',
        termMonths: 12,
        tenureMonths: 12,
        premium: 800,
        minSumInsured: 500000,
        status: 'pending'
      },
      {
        code: 'PEND003',
        title: 'Home Insurance Pending',
        type: 'Property', 
        description: 'Home insurance policy pending approval',
        termMonths: 12,
        tenureMonths: 12,
        premium: 300,
        minSumInsured: 200000,
        status: 'pending'
      }
    ];

    // Create policies if they don't exist
    for (const policy of samplePolicies) {
      const exists = await PolicyProduct.findOne({ code: policy.code });
      if (!exists) {
        await PolicyProduct.create(policy);
        console.log('Created pending policy:', policy.title);
      } else {
        console.log('Policy already exists:', policy.title);
      }
    }
    
    console.log('Sample pending policies created successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });