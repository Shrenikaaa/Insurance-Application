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
    allClaims: async (req, res) => {
        try {
            const Claim = (await import('../models/claim.js')).default;
            const claims = await Claim.find().lean();
            res.json({ success: true, claims: claims || [] });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    getPolicyById: async (req, res) => {
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
    approveClaim: async (req, res) => {
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
    getAuditLogs: async (req, res) => {
        try {
            const AuditLog = (await import('../models/auditLog.js')).default;
            const limit = parseInt(req.query.limit) || 20;
            const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(limit);
            res.json({ success: true, logs });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    getSummaryKPIs: async (req, res) => {
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
    allAgents: async (req, res) => {
        try {
            const agents = await Agent.find();
            res.json({ success: true, agents });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    getClaimById: async (req, res) => {
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
    approvePolicy: async (req, res) => {
        try {
            const { userPolicyId } = req.body;
            const userPolicy = await UserPolicy.findById(userPolicyId)
                .populate('policyProductId')
                .populate('userId');
            if (!userPolicy) {
                return res.status(404).json({ success: false, message: 'User policy not found' });
            }
            userPolicy.status = 'Approved';
            userPolicy.approved = true;
            await userPolicy.save();
            if (userPolicy.policyProductId) {
                await PolicyProduct.findByIdAndUpdate(userPolicy.policyProductId, { status: 'Approved' });
            }
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
            res.status(500).json({ success: false, error: err.message });
        }
    },
    allUserPolicies: async (req, res) => {
        try {
            const policies = await UserPolicy.find().populate('userId policyProductId');
            res.json({ success: true, policies });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    allPayments: async (req, res) => {
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
    assignPolicyToAgent: async (req, res) => {
        try {
            const { policyProductId, agentId } = req.body;
            const policyProduct = await PolicyProduct.findById(policyProductId);
            if (!policyProduct) {
                return res.status(404).json({ success: false, message: 'Policy product not found' });
            }
            const agent = await Agent.findById(agentId);
            if (!agent) {
                return res.status(404).json({ success: false, message: 'Agent not found' });
            }
            policyProduct.assignedAgentId = agentId;
            policyProduct.assignedAgentName = agent.name;
            policyProduct.status = 'Approved';
            await policyProduct.save();
            res.json({
                success: true,
                message: 'Policy product assigned by admin to agent',
                policyProductId: policyProduct._id,
                assignedAgentId: policyProduct.assignedAgentId,
                assignedAgentName: policyProduct.assignedAgentName
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    createAgent: async (req, res) => {
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
    allCustomerData: async (req, res) => {
        try {
            const customers = await User.find({ role: 'Customer' });
            const data = await Promise.all(customers.map(async (customer) => {
                const policies = await UserPolicy.find({ userId: customer._id })
                    .populate('policyProductId', 'title code premium description type termMonths');
                const payments = await Payment.find({ userId: customer._id })
                    .populate('userPolicyId', 'status');
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
            const customersWithPolicies = data.filter(customerData => customerData.policies.length > 0);
            res.json({ success: true, data: customersWithPolicies });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    addPolicy: async (req, res) => {
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
            res.status(500).json({ success: false, error: err.message });
        }
    },
    createPolicy: async (req, res) => {
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
            res.status(500).json({ success: false, error: err.message });
        }
    },
    updatePolicyById: async (req, res) => {
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
    },
    deletePolicyById: async (req, res) => {
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
    },
    assignAgentToClaim: async (req, res) => {
        try {
            const { claimId, agentId } = req.body;
            const Claim = (await import('../models/claim.js')).default;
            const claim = await Claim.findById(claimId);
            if (!claim) {
                return res.status(404).json({ success: false, message: 'Claim not found' });
            }
            const agent = await Agent.findById(agentId);
            if (!agent) {
                return res.status(404).json({ success: false, message: 'Agent not found' });
            }
            // Assign agent to claim
            claim.decidedByAgentId = agentId;
            await claim.save();
            // Also assign agent to the related policy if not already assigned
            const userPolicy = await UserPolicy.findById(claim.userPolicyId);
            if (userPolicy) {
                if (!userPolicy.assignedAgentId || String(userPolicy.assignedAgentId) !== String(agentId)) {
                    userPolicy.assignedAgentId = agentId;
                    userPolicy.assignedAgentName = agent.name;
                    await userPolicy.save();
                }
            }
            res.json({
                success: true,
                message: 'Agent assigned to claim and related policy',
                claimId: claim._id,
                agentId: agent._id,
                agentName: agent.name
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    getPendingPolicies: async (req, res) => {
        res.json({ success: true, message: 'Stub: getPendingPolicies' });
    },
    getApprovedPolicies: async (req, res) => {
        res.json({ success: true, message: 'Stub: getApprovedPolicies' });
    },
    getPolicies: async (req, res) => {
        res.json({ success: true, message: 'Stub: getPolicies' });
    },
    updatePolicy: async (req, res) => {
        res.json({ success: true, message: 'Stub: updatePolicy' });
    },
    deletePolicy: async (req, res) => {
        res.json({ success: true, message: 'Stub: deletePolicy' });
    },
    getAllPolicies: async (req, res) => {
        res.json({ success: true, message: 'Stub: getAllPolicies' });
    }
};

export default adminController;