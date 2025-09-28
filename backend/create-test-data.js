import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import PolicyProduct from './src/models/policyProduct.js';
import UserPolicy from './src/models/userPolicy.js';
import Payment from './src/models/payment.js';

dotenv.config();

async function createTestData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Create a sample policy product if none exists
        let samplePolicy = await PolicyProduct.findOne();
        if (!samplePolicy) {
            samplePolicy = new PolicyProduct({
                code: 'LIFE001',
                title: 'Sample Life Insurance',
                type: 'Life Insurance',
                minSumInsured: 50000,
                description: 'Sample life insurance policy for testing',
                termMonths: 12,
                tenureMonths: 24,
                status: 'Active'
            });
            await samplePolicy.save();
            console.log('Created sample policy product:', samplePolicy.title);
        } else {
            console.log('Using existing policy product:', samplePolicy.title);
        }

        // Create sample customers if none exist
        let sampleCustomer1 = await User.findOne({ role: 'Customer', email: 'john.doe@example.com' });
        if (!sampleCustomer1) {
            sampleCustomer1 = new User({
                name: 'John Doe',
                email: 'john.doe@example.com',
                phone: '1234567890',
                password: 'hashedpassword',
                role: 'Customer',
                address: '123 Main St, Anytown, USA'
            });
            await sampleCustomer1.save();
            console.log('Created sample customer:', sampleCustomer1.name);
        }

        let sampleCustomer2 = await User.findOne({ role: 'Customer', email: 'jane.smith@example.com' });
        if (!sampleCustomer2) {
            sampleCustomer2 = new User({
                name: 'Jane Smith',
                email: 'jane.smith@example.com',
                phone: '0987654321',
                password: 'hashedpassword',
                role: 'Customer',
                address: '456 Oak St, Another City, USA'
            });
            await sampleCustomer2.save();
            console.log('Created sample customer:', sampleCustomer2.name);
        }

        // Create sample pending user policies
        const existingPendingPolicy = await UserPolicy.findOne({ 
            userId: sampleCustomer1._id, 
            policyProductId: samplePolicy._id,
            status: 'Pending'
        });
        
        if (!existingPendingPolicy) {
            const pendingPolicy = new UserPolicy({
                userId: sampleCustomer1._id,
                policyProductId: samplePolicy._id,
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                status: 'Pending',
                approved: false
            });
            await pendingPolicy.save();
            console.log('Created pending policy for:', sampleCustomer1.name);
        }

        // Create sample approved user policy
        const existingApprovedPolicy = await UserPolicy.findOne({ 
            userId: sampleCustomer2._id, 
            policyProductId: samplePolicy._id,
            status: 'Approved'
        });
        
        if (!existingApprovedPolicy) {
            const approvedPolicy = new UserPolicy({
                userId: sampleCustomer2._id,
                policyProductId: samplePolicy._id,
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                status: 'Approved',
                approved: true
            });
            await approvedPolicy.save();
            console.log('Created approved policy for:', sampleCustomer2.name);
        }

        console.log('Test data creation completed!');

        // Create sample payments for approved policies
        const approvedPolicies = await UserPolicy.find({ approved: true })
            .populate('userId')
            .populate('policyProductId');

        console.log('Creating payments for approved policies...');
        
        for (const policy of approvedPolicies) {
            // Check if payment already exists for this policy
            const existingPayment = await Payment.findOne({ 
                userId: policy.userId._id, 
                userPolicyId: policy._id 
            });

            if (!existingPayment) {
                const payment = new Payment({
                    userId: policy.userId._id,
                    userPolicyId: policy._id,
                    amount: policy.policyProductId.minSumInsured * 0.1, // 10% of sum insured as premium
                    method: 'Simulated',
                    reference: `PAY_${policy._id}_${Date.now()}`
                });
                await payment.save();
                console.log(`Created payment for policy: ${policy.policyProductId.title} - Customer: ${policy.userId.name}`);
            } else {
                console.log(`Payment already exists for policy: ${policy.policyProductId.title} - Customer: ${policy.userId.name}`);
            }
        }
        
        // Query and display the data
        const pendingPolicies = await UserPolicy.find({ status: 'Pending' })
            .populate('userId')
            .populate('policyProductId');
        console.log('Pending policies:', pendingPolicies.length);

        const finalApprovedPolicies = await UserPolicy.find({ status: 'Approved' })
            .populate('userId')
            .populate('policyProductId');
        console.log('Approved policies:', finalApprovedPolicies.length);

        const allPayments = await Payment.find({})
            .populate('userId')
            .populate('userPolicyId');
        console.log('Total payments:', allPayments.length);

        console.log('\n=== POLICY-PAYMENT SUMMARY ===');
        for (const payment of allPayments) {
            console.log(`Payment: ${payment.userId.name} paid $${payment.amount} for ${payment.userPolicyId.policyProductId || 'Policy'}`);
        }

    } catch (error) {
        console.error('Error creating test data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

createTestData();