// Admin Controller
import UserPolicy from '../models/userPolicy.js';
import Payment from '../models/payment.js';
import User from '../models/User.js';
import Agent from '../models/agent.js';
import PolicyProduct from '../models/policyProduct.js';
import Joi from 'joi';

const createPolicySchema = Joi.object({
    code: Joi.string().trim().min(2).max(20).required(),
    title: Joi.string().trim().min(3).max(100).required(),
    type: Joi.string().trim().min(2).max(50).required(),
    description: Joi.string().trim().min(0).max(500).required(),
    termMonths: Joi.number().integer().min(1).max(600).required(),
    tenureMonths: Joi.number().integer().min(1).max(600).required(),
    minSumInsured: Joi.number().positive().required(),
    status: Joi.string().trim().valid('Active', 'Inactive').optional()
});

const updatePolicySchema = Joi.object({
    code: Joi.string().trim().min(2).max(20).optional(),
    title: Joi.string().trim().min(3).max(100).optional(),
    type: Joi.string().trim().min(2).max(50).optional(),
    description: Joi.string().trim().min(0).max(500).optional(),
    termMonths: Joi.number().integer().min(1).max(600).optional(),
    tenureMonths: Joi.number().integer().min(1).max(600).optional(),
    minSumInsured: Joi.number().positive().optional(),
    status: Joi.string().trim().valid('Active', 'Inactive').optional()
}).min(1);

const adminController = {
    async allClaims(req, res) {
        try {
            console.log('Loading all claims...');
            const Claim = (await import('../models/claim.js')).default;
            // Populate userId (customer) and userPolicyId (policy info)
            const claims = await Claim.find()
                .populate({ path: 'userId', select: 'name email' })
                .populate({ path: 'userPolicyId', populate: { path: 'policyProductId', select: 'title code' } })
                .lean();
            console.log(`Found ${claims.length} claims`);
            res.json({ success: true, claims: claims || [] });
        } catch (err) {
            console.error('Error in allClaims:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async getPolicyById(req, res) {
        try {
            const policy = await PolicyProduct.findById(req.params.id);
            if (!policy) {
                return res.status(404).json({ success: false, message: 'Policy not found' });
            }
            res.json({ success: true, policy });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async approveClaim(req, res) {
        try {
            const { claimId, status } = req.body;
            const Claim = (await import('../models/claim.js')).default;
            const claim = await Claim.findById(claimId);
            if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
            claim.status = status || 'Approved';
            await claim.save();
            if (claim.userPolicyId) {
                const userPolicy = await UserPolicy.findById(claim.userPolicyId);
                if (userPolicy && (status === 'Approved' || status === 'Claimed')) {
                    userPolicy.status = 'Claimed';
                    await userPolicy.save();
                }
            }
            res.json({ success: true, claim });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async getAuditLogs(req, res) {
        try {
            const AuditLog = (await import('../models/auditLog.js')).default;
            const limit = parseInt(req.query.limit) || 20;
            const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(limit);
            res.json({ success: true, logs });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async getSummaryKPIs(req, res) {
        try {
            const Claim = (await import('../models/claim.js')).default;
            const usersCount = await User.countDocuments();
            const policiesSold = await UserPolicy.countDocuments({ status: 'Approved' });
            const claimsPending = await Claim.countDocuments({ status: 'Pending' });
            const claimsApproved = await Claim.countDocuments({ status: 'Approved' });
            const agentsCount = await Agent.countDocuments();
            const paymentsPending = await Payment.countDocuments({ status: 'Pending' });
            const paymentsDone = await Payment.countDocuments({ status: 'Done' });
            const totalPayments = await Payment.aggregate([
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);
            res.json({
                success: true,
                usersCount,
                policiesSold,
                claimsPending,
                claimsApproved,
                agentsCount,
                paymentsPending,
                paymentsDone,
                totalPayments: totalPayments[0]?.total || 0
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async allAgents(req, res) {
        try {
            const agents = await Agent.find();
            res.json({ success: true, agents });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async getClaimById(req, res) {
        try {
            const Claim = (await import('../models/claim.js')).default;
            const claim = await Claim.findById(req.params.id).populate('userId userPolicyId decidedByAgentId');
            if (!claim) {
                return res.status(404).json({ success: false, message: 'Claim not found' });
            }
            res.json({ success: true, claim });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async approvePolicy(req, res) {
        try {
            console.log('=== APPROVE POLICY REQUEST ===');
            console.log('Request body:', req.body);
            
            const { userPolicyId } = req.body;
            
            // Find the user policy by ID
            const userPolicy = await UserPolicy.findById(userPolicyId)
                .populate('policyProductId')
                .populate('userId');
                
            if (!userPolicy) {
                console.log('User policy not found for ID:', userPolicyId);
                return res.status(404).json({ success: false, message: 'User policy not found' });
            }

            // Update the user policy status to 'Approved'
            userPolicy.status = 'Approved';
            userPolicy.approved = true;
            await userPolicy.save();

            // Also update the PolicyProduct status to 'Approved' when a customer policy is approved
            if (userPolicy.policyProductId) {
                await PolicyProduct.findByIdAndUpdate(userPolicy.policyProductId, { 
                    status: 'Approved' 
                });
                console.log(`PolicyProduct ${userPolicy.policyProductId.title} status updated to Approved`);
            }

            console.log(`Policy ${userPolicy.policyProductId.title} approved for customer ${userPolicy.userId.name}`);
            res.json({ 
                success: true, 
                message: 'Policy approved successfully',
                userPolicy: {
                    id: userPolicy._id,
                    status: userPolicy.status,
                    customerName: userPolicy.userId.name,
                    policyTitle: userPolicy.policyProductId.title
                }
            });
        } catch (err) {
            console.error('Error in approvePolicy:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async allUserPolicies(req, res) {
        try {
            const policies = await UserPolicy.find().populate('userId policyProductId');
            res.json({ success: true, policies });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async allPayments(req, res) {
        try {
            const payments = await Payment.find()
                .populate('userId', 'name email')
                .populate({
                    path: 'userPolicyId',
                    populate: {
                        path: 'policyProductId',
                        select: 'title code description premium'
                    }
                })
                .sort({ createdAt: -1 });
            res.json({ success: true, payments });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async assignPolicyToAgent(req, res) {
        try {
            console.log('=== ASSIGN AGENT TO POLICY REQUEST ===');
            console.log('Request body:', req.body);
            
            const { policyProductId, agentId } = req.body;
            
            console.log('Looking for policy with ID:', policyProductId);
            const policyProduct = await PolicyProduct.findById(policyProductId);
            if (!policyProduct) {
                console.log('Policy not found!');
                return res.status(404).json({ success: false, message: 'Policy product not found' });
            }
            console.log('Policy found:', {
                id: policyProduct._id,
                title: policyProduct.title,
                code: policyProduct.code,
                currentAssignedAgent: policyProduct.assignedAgentName || 'None'
            });
            
            console.log('Looking for agent with ID:', agentId);
            const agent = await Agent.findById(agentId);
            if (!agent) {
                console.log('Agent not found!');
                return res.status(404).json({ success: false, message: 'Agent not found' });
            }
            console.log('Agent found:', agent.name);
            
            // Update policy with agent info and set status to Approved
            policyProduct.assignedAgentId = agentId;
            policyProduct.assignedAgentName = agent.name;
            policyProduct.status = 'Approved';
            console.log('Saving policy with assigned agent and status Approved:', {
                policyId: policyProduct._id,
                assignedAgentId: agentId,
                assignedAgentName: agent.name,
                status: policyProduct.status
            });
            await policyProduct.save();
            console.log('Policy saved successfully with status Approved');
            
            // Verify the update by checking all policies
            const allPoliciesAfterUpdate = await PolicyProduct.find().sort({ createdAt: -1 });
            console.log('All policies after assignment update:');
            allPoliciesAfterUpdate.forEach((p, i) => {
                console.log(`Policy ${i + 1} (${p._id.toString()}):`, {
                    title: p.title,
                    assignedAgentName: p.assignedAgentName || 'None'
                });
            });
            
            res.json({
                success: true,
                message: 'Policy product assigned by admin to agent',
                policyProductId: policyProduct._id,
                assignedAgentId: policyProduct.assignedAgentId,
                assignedAgentName: policyProduct.assignedAgentName
            });
        } catch (err) {
            console.error('Error assigning agent to policy:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async createAgent(req, res) {
        try {
            const { name, email, password } = req.body;
            if (!password || password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password is required and must be at least 6 characters.' });
            }
            const existingAgent = await Agent.findOne({ email });
            if (existingAgent) {
                return res.status(409).json({ success: false, message: 'Agent with this email already exists.' });
            }
            const agent = new Agent({ name, email, password });
            await agent.save();
            res.json({ success: true, agent: { _id: agent._id, name: agent.name, email: agent.email, role: agent.role } });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async allCustomerData(req, res) {
        try {
            const customers = await User.find({ role: 'Customer' });
            const data = await Promise.all(customers.map(async (customer) => {
                const policies = await UserPolicy.find({ userId: customer._id })
                    .populate('policyProductId', 'title code premium description type termMonths');
                const payments = await Payment.find({ userId: customer._id })
                    .populate('userPolicyId', 'status');
                
                // Calculate totals
                const totalPremium = policies.reduce((sum, policy) => 
                    sum + (policy.policyProductId?.premium || 0), 0);
                const totalPaid = payments.reduce((sum, payment) => 
                    sum + (payment.amount || 0), 0);
                
                return { 
                    customer, 
                    policies, 
                    payments,
                    totalPremium,
                    totalPaid
                };
            }));
            
            // Filter only customers who have policies
            const customersWithPolicies = data.filter(customerData => customerData.policies.length > 0);
            
            res.json({ success: true, data: customersWithPolicies });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async addPolicy(req, res) {
        try {
            const { error, value } = createPolicySchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(detail => detail.message)
                });
            }
            const { code, title, description, premium, termMonths, minSumInsured } = value;
            const existingPolicy = await PolicyProduct.findOne({ code });
            if (existingPolicy) {
                return res.status(409).json({
                    success: false,
                    message: 'Policy with this code already exists'
                });
            }
            const newPolicy = new PolicyProduct({
                code,
                title,
                description,
                premium,
                termMonths,
                minSumInsured: minSumInsured || 0
            });
            const savedPolicy = await newPolicy.save();
            res.status(201).json({
                success: true,
                message: 'Policy added successfully',
                data: savedPolicy
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async getPolicies(req, res) {
        try {
            const policies = await PolicyProduct.find();
            res.status(200).json({
                success: true,
                message: 'Admin: All policies retrieved successfully',
                data: policies,
                count: policies.length,
                adminAccess: true
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async updatePolicy(req, res) {
        try {
            const { id } = req.params;
            if (!id || id.length !== 24) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid policy ID format. Must be 24 characters long.'
                });
            }
            const { error, value } = updatePolicySchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(detail => detail.message)
                });
            }
            const existingPolicy = await PolicyProduct.findById(id);
            if (!existingPolicy) {
                return res.status(404).json({
                    success: false,
                    message: 'Policy not found'
                });
            }
            if (value.code && value.code !== existingPolicy.code) {
                const codeExists = await PolicyProduct.findOne({ code: value.code, _id: { $ne: id } });
                if (codeExists) {
                    return res.status(409).json({
                        success: false,
                        message: 'Policy code already exists'
                    });
                }
            }
            const updateData = { ...value, updatedAt: new Date() };
            const updatedPolicy = await PolicyProduct.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );
            res.status(200).json({
                success: true,
                message: 'Admin: Policy updated successfully',
                data: updatedPolicy
            });
        } catch (err) {
            if (err.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid policy ID format'
                });
            }
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async deletePolicy(req, res) {
        try {
            const { id } = req.params;
            const deletedPolicy = await PolicyProduct.findByIdAndDelete(id);
            if (!deletedPolicy) {
                return res.status(404).json({
                    success: false,
                    message: 'Policy not found'
                });
            }
            res.status(200).json({
                success: true,
                message: 'Policy deleted successfully',
                data: {
                    deletedPolicyId: id,
                    deletedPolicyCode: deletedPolicy.code,
                    deletedPolicyTitle: deletedPolicy.title
                }
            });
        } catch (err) {
            if (err.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid policy ID format'
                });
            }
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async getPendingPolicies(req, res) {
        try {
            console.log('=== GET PENDING POLICIES REQUEST ===');

            // Fetch user policies where the customer policy status is 'Pending'
            const pendingPolicies = await UserPolicy.find({ 
                status: 'Pending',
                policyProductId: { $ne: null }, // Only get policies with valid policyProductId
                userId: { $ne: null } // Only get policies with valid userId
            })
                .populate({ path: 'policyProductId', select: 'title code price description' })
                .populate({ path: 'userId', select: 'name email' });

            console.log('Found pending policies:', pendingPolicies.length);
            
            // Debug: Log the first few policies to see their structure
            if (pendingPolicies.length > 0) {
                console.log('Sample pending policy structure:', {
                    id: pendingPolicies[0]._id,
                    status: pendingPolicies[0].status,
                    policyProductId: pendingPolicies[0].policyProductId,
                    userId: pendingPolicies[0].userId
                });
            }

            if (pendingPolicies.length === 0) {
                console.log('No pending policies found.');
                return res.json({ success: true, message: 'No pending policies available.', policies: [] });
            }

            // Map the valid policies (additional filter as backup)
            const response = pendingPolicies
                .filter(policy => policy.policyProductId && policy.userId) // Additional filter as backup
                .map(policy => ({
                    userPolicyId: policy._id,
                    policyId: policy.policyProductId._id,
                    policyTitle: policy.policyProductId.title,
                    policyCode: policy.policyProductId.code,
                    policyPrice: policy.policyProductId.price,
                    customerName: policy.userId.name,
                    customerEmail: policy.userId.email,
                    purchaseDate: policy.createdAt,
                    status: policy.status
                }));

            console.log('Valid pending policies response:', response);
            res.json({ success: true, policies: response });
        } catch (err) {
            console.error('Error in getPendingPolicies:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Get approved policies for customers to make payments
    async getApprovedPolicies(req, res) {
        try {
            console.log('=== GET APPROVED POLICIES REQUEST ===');

            // Fetch user policies where the status is 'Approved'
            const approvedPolicies = await UserPolicy.find({ 
                status: 'Approved',
                policyProductId: { $ne: null }, // Only get policies with valid policyProductId
                userId: { $ne: null } // Only get policies with valid userId
            })
                .populate({ path: 'policyProductId', select: 'title code price description type' })
                .populate({ path: 'userId', select: 'name email' });

            console.log('Found approved policies:', approvedPolicies.length);

            // Map the valid policies (additional filter as backup)
            const response = approvedPolicies
                .filter(policy => policy.policyProductId && policy.userId) // Additional filter as backup
                .map(policy => ({
                    userPolicyId: policy._id,
                    policyId: policy.policyProductId._id,
                    policyTitle: policy.policyProductId.title,
                    policyCode: policy.policyProductId.code,
                    policyPrice: policy.policyProductId.price,
                    customerName: policy.userId.name,
                    customerEmail: policy.userId.email,
                    purchaseDate: policy.createdAt,
                    status: policy.status
                }));

            res.json({ success: true, policies: response });
        } catch (err) {
            console.error('Error in getApprovedPolicies:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async assignClaimToAgent(req, res) {
        try {
            const { claimId, agentId } = req.body;
            const Claim = (await import('../models/claim.js')).default;
            const Agent = (await import('../models/agent.js')).default;
            const claim = await Claim.findById(claimId);
            if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
            const agent = await Agent.findById(agentId);
            if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
            claim.decidedByAgentId = agentId;
            await claim.save();
            res.json({ success: true, claim });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

};

// Basic Policy CRUD Methods (for backward compatibility)
adminController.addPolicy = async (req, res) => {
    try {
        const { error, value } = createPolicySchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed', 
                details: error.details 
            });
        }

        const newPolicy = new PolicyProduct(value);
        const savedPolicy = await newPolicy.save();
        
        res.status(201).json({
            success: true,
            message: 'Policy created successfully',
            policy: savedPolicy
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Policy code already exists'
            });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

adminController.getPolicies = async (req, res) => {
    try {
        const policies = await PolicyProduct.find().sort({ createdAt: -1 });
        res.json({ 
            success: true, 
            message: 'Policies retrieved successfully',
            policies: policies
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

adminController.updatePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = updatePolicySchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed', 
                details: error.details 
            });
        }

        const updatedPolicy = await PolicyProduct.findByIdAndUpdate(
            id, 
            value, 
            { new: true, runValidators: true }
        );

        if (!updatedPolicy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        res.json({
            success: true,
            message: 'Policy updated successfully',
            policy: updatedPolicy
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid policy ID format'
            });
        }
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Policy code already exists'
            });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

adminController.deletePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedPolicy = await PolicyProduct.findByIdAndDelete(id);
        
        if (!deletedPolicy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        res.json({
            success: true,
            message: 'Policy deleted successfully',
            policy: {
                id: deletedPolicy._id,
                name: deletedPolicy.title,
                code: deletedPolicy.code
            }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid policy ID format'
            });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

// RESTful Policy Management Methods (moved outside to avoid conflicts)
adminController.getAllPolicies = async (req, res) => {
    try {
        console.log('=== GET ALL POLICIES REQUEST ===');
        const policies = await PolicyProduct.find().sort({ createdAt: -1 });
        console.log('Found policies count:', policies.length);
        
        policies.forEach((policy, index) => {
            console.log(`Policy ${index + 1}:`, {
                id: policy._id.toString(),
                title: policy.title,
                code: policy.code,
                assignedAgentId: policy.assignedAgentId ? policy.assignedAgentId.toString() : null,
                assignedAgentName: policy.assignedAgentName || null
            });
        });
        
        res.json({ 
            success: true, 
            message: 'Policies retrieved successfully',
            policies: policies
        });
    } catch (err) {
        console.error('Error fetching policies:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

adminController.createPolicy = async (req, res) => {
    try {
        console.log('=== CREATE POLICY REQUEST RECEIVED ===');
        console.log('Request body:', req.body);
        console.log('User info:', req.user);
        
        const { error, value } = createPolicySchema.validate(req.body);
        if (error) {
            console.log('Validation error:', error.details);
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed', 
                details: error.details 
            });
        }

        console.log('Validated data:', value);
        const newPolicy = new PolicyProduct(value);
        console.log('Creating new policy:', newPolicy);
        
        const savedPolicy = await newPolicy.save();
        console.log('Policy saved successfully:', savedPolicy);
        
        res.status(201).json({
            success: true,
            message: 'Policy created successfully',
            policy: savedPolicy
        });
    } catch (err) {
        console.error('Error creating policy:', err);
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Policy code already exists'
            });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

adminController.updatePolicyById = async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = updatePolicySchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed', 
                details: error.details 
            });
        }

        const updatedPolicy = await PolicyProduct.findByIdAndUpdate(
            id, 
            value, 
            { new: true, runValidators: true }
        );

        if (!updatedPolicy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        res.json({
            success: true,
            message: 'Policy updated successfully',
            policy: updatedPolicy
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid policy ID format'
            });
        }
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Policy code already exists'
            });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

adminController.deletePolicyById = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedPolicy = await PolicyProduct.findByIdAndDelete(id);
        
        if (!deletedPolicy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        res.json({
            success: true,
            message: 'Policy deleted successfully',
            policy: {
                id: deletedPolicy._id,
                name: deletedPolicy.title,
                code: deletedPolicy.code
            }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid policy ID format'
            });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

export default adminController;