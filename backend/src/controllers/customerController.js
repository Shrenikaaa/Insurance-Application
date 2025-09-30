// Customer Controller
// Handles viewing policies, purchasing, making payments, viewing history
import PolicyProduct from '../models/policyProduct.js';
import UserPolicy from '../models/userPolicy.js';
import Payment from '../models/payment.js';
import Joi from 'joi';

const purchaseSchema = Joi.object({
  policyProductId: Joi.string().required(),
  startDate: Joi.date().required(),
  nominee: Joi.object({
    name: Joi.string().required(),
    relation: Joi.string().required()
  }).optional()
});

const paymentSchema = Joi.object({
  userPolicyId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  method: Joi.string().valid('Card', 'Netbanking', 'Offline', 'Simulated').default('Simulated'),
  reference: Joi.string().optional()
});

const claimSchema = Joi.object({
  userPolicyId: Joi.string().required(),
  incidentDate: Joi.date().required(),
  description: Joi.string().min(10).max(1000).required(),
  amountClaimed: Joi.number().positive().required(),
  incidentType: Joi.string().min(3).max(50).optional(),
  attachments: Joi.array().items(Joi.string()).optional()
});

const customerController = {
  // Stub for missing methods to prevent route errors
  async viewPolicies(req, res) { res.status(501).json({ success: false, message: 'Not implemented' }); },
  async purchasePolicy(req, res) {
    try {
      console.log('=== PURCHASE POLICY REQUEST ===');
      console.log('Request body:', req.body);
      console.log('User:', req.user);
      
      // Validate request body
      const { error, value } = purchaseSchema.validate(req.body);
      if (error) {
        console.log('Validation error:', error.details);
        return res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) });
      }
      
      const { policyProductId, startDate, nominee } = value;
      console.log('Extracted values:', { policyProductId, startDate, nominee });
      
      // Check if policy exists and is active/approved
      const policy = await PolicyProduct.findOne({ _id: policyProductId, status: { $in: ['Active', 'Approved', 'approved'] } });
      if (!policy) {
        console.log('Policy not found or not available:', policyProductId);
        return res.status(404).json({ success: false, message: 'Policy not found or not available for purchase' });
      }
      
      console.log('Found policy:', policy);
      
      // Calculate endDate using termMonths (or tenureMonths)
      const startDateObj = new Date(startDate);
      const monthsToAdd = policy.termMonths || policy.tenureMonths || 12; // Default to 12 months if not specified
      const endDateObj = new Date(startDateObj);
      endDateObj.setMonth(endDateObj.getMonth() + monthsToAdd);
      
      console.log('Date calculations:', {
        startDate: startDateObj,
        endDate: endDateObj,
        monthsToAdd: monthsToAdd
      });
      
      // Prepare user policy data with guaranteed endDate
      const userPolicyData = {
        userId: req.user.userId,
        policyProductId,
        startDate: startDateObj,
        endDate: endDateObj || new Date(Date.now() + 365*24*60*60*1000), // Fallback to 1 year from now
        status: 'Pending',
      };
      
      // Add nominee if provided
      if (nominee && nominee.name) {
        userPolicyData.nominee = nominee;
      }
      
      console.log('UserPolicy data to create:', userPolicyData);
      
      // Create user policy
      const userPolicy = await UserPolicy.create(userPolicyData);
      console.log('UserPolicy created successfully:', userPolicy);
      
      res.status(201).json({ success: true, userPolicy, message: 'Policy purchased successfully!' });
    } catch (err) {
      console.error('Error purchasing policy:', err);
      console.error('Error stack:', err.stack);
      res.status(500).json({ success: false, message: 'Error purchasing policy', error: err.message });
    }
  },
  async makePayment(req, res) {
    try {
      // Validate request body
      const { error, value } = paymentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) });
      }
      const { userPolicyId, amount, method, reference } = value;
      // Find user policy and populate policyProductId
      const userPolicy = await UserPolicy.findById(userPolicyId).populate('policyProductId');
      if (!userPolicy) {
        return res.status(404).json({ success: false, message: 'User policy not found' });
      }
      // Update premiumPaid
      userPolicy.premiumPaid = (userPolicy.premiumPaid || 0) + amount;
      // Check if payment is sufficient to approve policy
      const minSumInsured = userPolicy.policyProductId?.minSumInsured || 0;
      if (userPolicy.premiumPaid >= minSumInsured) {
        userPolicy.status = 'Approved';
        userPolicy.approved = true;
      }
      await userPolicy.save();
      // Create payment record
      const payment = await Payment.create({
        userPolicyId,
        userId: req.user.userId,
        amount,
        method,
        reference,
        status: 'Completed',
        paidAt: new Date()
      });
      res.status(201).json({ success: true, payment, message: 'Payment successful!' });
    } catch (err) {
      console.error('Error making payment:', err);
      res.status(500).json({ success: false, message: 'Error making payment', error: err.message });
    }
  },
  async paymentHistory(req, res) { res.status(501).json({ success: false, message: 'Not implemented' }); },
  async myPolicies(req, res) {
    try {
      console.log('=== GET MY POLICIES REQUEST ===');
      console.log('User:', req.user);

      // Get all user policies for the logged-in customer
      const userPolicies = await UserPolicy.find({ userId: req.user.userId })
        .populate('policyProductId')
        .sort({ createdAt: -1 });

      console.log('Found user policies:', userPolicies.length);

      if (!userPolicies || userPolicies.length === 0) {
        return res.status(200).json({ 
          success: true, 
          policies: [], 
          message: 'No policies found' 
        });
      }

      // Transform the data to match frontend expectations
      const formattedPolicies = userPolicies.map(userPolicy => {
        const policy = userPolicy.policyProductId;
        if (!policy) {
          return {
            userPolicyId: userPolicy._id,
            status: userPolicy.status,
            startDate: userPolicy.startDate,
            endDate: userPolicy.endDate,
            premiumPaid: userPolicy.premiumPaid || 0,
            nominee: userPolicy.nominee,
            policy: null
          };
        }
        return {
          userPolicyId: userPolicy._id,
          status: userPolicy.status,
          startDate: userPolicy.startDate,
          endDate: userPolicy.endDate,
          premiumPaid: userPolicy.premiumPaid || 0,
          nominee: userPolicy.nominee,
          policy: {
            _id: policy._id,
            code: policy.code,
            title: policy.title || policy.name,
            type: policy.type,
            description: policy.description,
            termMonths: policy.termMonths || policy.tenureMonths,
            tenureMonths: policy.tenureMonths || policy.termMonths,
            minSumInsured: policy.minSumInsured,
            status: policy.status,
            createdAt: policy.createdAt
          }
        };
      });

      res.status(200).json({
        success: true,
        policies: formattedPolicies,
        message: 'My policies retrieved successfully'
      });
    } catch (err) {
      console.error('Error getting my policies:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving my policies', 
        error: err.message 
      });
    }
  },
  async cancelPolicy(req, res) {
    try {
      console.log('=== CANCEL POLICY REQUEST ===');
      console.log('Request body:', req.body);
      console.log('User:', req.user);

      const { userPolicyId } = req.body;

      if (!userPolicyId) {
        return res.status(400).json({ 
          success: false, 
          message: 'User Policy ID is required' 
        });
      }

      // Find the user policy to cancel
      const userPolicy = await UserPolicy.findById(userPolicyId);
      if (!userPolicy) {
        return res.status(404).json({ 
          success: false, 
          message: 'User policy not found' 
        });
      }

      // Check if the policy belongs to the requesting user
      if (userPolicy.userId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'You are not authorized to cancel this policy' 
        });
      }

      // Check if policy can be cancelled (only Approved or Pending policies)
      if (!['Approved', 'Pending'].includes(userPolicy.status)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Only Approved or Pending policies can be cancelled' 
        });
      }

      // Update policy status to Cancelled
      userPolicy.status = 'Cancelled';
      userPolicy.cancelledAt = new Date();
      await userPolicy.save();

      console.log('Policy cancelled successfully:', userPolicy._id);

      res.status(200).json({
        success: true,
        message: 'Policy cancelled successfully',
        userPolicy: {
          _id: userPolicy._id,
          status: userPolicy.status,
          cancelledAt: userPolicy.cancelledAt
        }
      });
    } catch (err) {
      console.error('Error cancelling policy:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error cancelling policy', 
        error: err.message 
      });
    }
  },

  // Claims related methods
  async getPolicyById(req, res) { res.status(501).json({ success: false, message: 'Not implemented' }); },
  async getApprovedPolicies(req, res) {
    try {
      // Return approved user policies for the logged-in customer, with policy details populated
      const userId = req.user.userId;
      const policies = await UserPolicy.find({
        userId,
        status: 'Approved'
      }).populate('policyProductId');
      if (!policies || policies.length === 0) {
        return res.status(404).json({ success: false, message: 'No approved policies found' });
      }
      res.json({ success: true, policies });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching approved policies', error: error.message });
    }
  },
  async getClaimablePolicies(req, res) { res.status(501).json({ success: false, message: 'Not implemented' }); },
  async getClaimablePolicies(req, res) {
    try {
      // Find all user policies for the logged-in user that are approved
      const userId = req.user.userId;
      const policies = await UserPolicy.find({
        userId,
        status: 'Approved'
      }).populate('policyProductId');
      res.json({
        success: true,
        policies
      });
    } catch (err) {
      console.error('Error in getClaimablePolicies:', err);
      res.status(500).json({ success: false, message: 'Error fetching claimable policies', error: err.message });
    }
  },
  // Get details for a specific claim by claimId (customer)
  async getClaimById(req, res) {
    try {
      const Claim = (await import('../models/claim.js')).default;
      const claim = await Claim.findById(req.params.id).populate('userId userPolicyId decidedByAgentId');
      if (!claim) {
        return res.status(404).json({ success: false, message: 'Claim not found' });
      }
      // Only allow customer to view claim if they are the owner
      if (String(claim.userId) !== String(req.user.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      res.json({ success: true, claim });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Raise a claim for a policy
  async raiseClaim(req, res) {
    try {
      console.log('=== RAISE CLAIM REQUEST ===');
      console.log('Request body:', req.body);
      console.log('User:', req.user);

      // Validate request data
      const { error, value } = claimSchema.validate(req.body);
      if (error) {
        console.log('Validation error:', error.details);
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const { userPolicyId, incidentDate, description, amountClaimed, incidentType } = value;

      // Check if user policy exists and belongs to the user
      const userPolicy = await UserPolicy.findById(userPolicyId)
        .populate('policyProductId', 'title code premium minSumInsured');

      if (!userPolicy) {
        console.log('User policy not found:', userPolicyId);
        return res.status(404).json({ 
          success: false, 
          message: 'Policy not found' 
        });
      }

      // Verify the policy belongs to the requesting user
      if (userPolicy.userId.toString() !== req.user.userId) {
        console.log('Policy ownership mismatch:', {
          policyUserId: userPolicy.userId.toString(),
          requestUserId: req.user.userId
        });
        return res.status(403).json({ 
          success: false, 
          message: 'You can only raise claims for your own policies' 
        });
      }

      // Check if policy is approved (only approved policies can have claims)
      if (userPolicy.status !== 'Approved') {
        console.log('Policy not approved:', userPolicy.status);
        return res.status(400).json({ 
          success: false, 
          message: 'Claims can only be raised for approved policies' 
        });
      }

      // Validate claim amount doesn't exceed policy coverage
      const maxClaimAmount = userPolicy.policyProductId?.minSumInsured || 0;
      if (amountClaimed > maxClaimAmount) {
        console.log('Claim amount exceeds coverage:', {
          amountClaimed,
          maxCoverage: maxClaimAmount
        });
        return res.status(400).json({ 
          success: false, 
          message: `Claim amount ($${amountClaimed}) exceeds policy coverage ($${maxClaimAmount})` 
        });
      }

      // Check if incident date is valid (not in future, not before policy start)
      const currentDate = new Date();
      const policyStartDate = new Date(userPolicy.startDate);
      const incidentDateObj = new Date(incidentDate);

      if (incidentDateObj > currentDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'Incident date cannot be in the future' 
        });
      }

      if (incidentDateObj < policyStartDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'Incident date cannot be before policy start date' 
        });
      }

      // Create the claim
      const Claim = (await import('../models/claim.js')).default;
      const claim = await Claim.create({
        userId: req.user.userId,
        userPolicyId,
        incidentDate: incidentDateObj,
        description,
        amountClaimed,
        incidentType: incidentType || 'General Claim',
        status: 'Pending'
      });

      console.log('Claim created successfully:', claim._id);

      // Populate the created claim for response
      const populatedClaim = await Claim.findById(claim._id)
        .populate('userId', 'name email')
        .populate({
          path: 'userPolicyId',
          populate: {
            path: 'policyProductId',
            select: 'title code premium'
          }
        });

      res.status(201).json({ 
        success: true, 
        claim: populatedClaim,
        message: 'Claim submitted successfully. You will be notified of the status updates.'
      });

    } catch (err) {
      console.error('Error in raiseClaim:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error raising claim',
        error: err.message 
      });
    }
  },

  // Get my claims (customer)
  async getMyClaims(req, res) {
    try {
      console.log('=== GET MY CLAIMS REQUEST ===');
      console.log('User:', req.user);

      const Claim = (await import('../models/claim.js')).default;
      
      // Get all claims for the current user
      const claims = await Claim.find({ userId: req.user.userId })
        .populate('userId', 'name email')
        .populate({
          path: 'userPolicyId',
          populate: {
            path: 'policyProductId',
            select: 'title code premium'
          }
        })
        .populate('decidedByAgentId', 'name email')
        .sort({ createdAt: -1 }); // Most recent first

      console.log('Found claims:', claims.length);

      res.json({ 
        success: true, 
        claims: claims 
      });

    } catch (err) {
      console.error('Error in getMyClaims:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching claims',
        error: err.message 
      });
    }
  },

  // Get available policies for customers (admin-created policies)
  async getAvailablePolicies(req, res) {
    try {
      console.log('=== GET AVAILABLE POLICIES REQUEST ===');
      console.log('User info:', req.user);

      // Fetch all policies (no status filter)
      const policies = await PolicyProduct.find();
      console.log('Found policies:', policies);

      if (!policies || policies.length === 0) {
        return res.status(404).json({ success: false, message: 'No available policies found' });
      }

      res.json({ success: true, policies });
    } catch (error) {
      console.error('Error in getAvailablePolicies:', error);
      res.status(500).json({ success: false, message: 'Error fetching available policies', error: error.message });
    }
  }
};

export default customerController;