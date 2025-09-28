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
    // View all policies
  async viewPolicies(req, res) {
    try {
      console.log('=== CUSTOMER VIEW POLICIES REQUEST ===');
      console.log('User info:', req.user);
      
      const policies = await PolicyProduct.find();
      console.log('Found policies:', policies.length);
      
      res.json({ success: true, policies });
    } catch (err) {
      console.error('Error in viewPolicies:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Purchase a policy
  async purchasePolicy(req, res) {
    try {
      console.log('Purchase policy request received:', req.body);
      const { error } = purchaseSchema.validate(req.body);
      if (error) {
        console.error('Validation error:', error.details[0].message);
        return res.status(400).json({ success: false, message: error.details[0].message });
      }
      const policy = await PolicyProduct.findById(req.body.policyProductId);
      if (!policy) {
        console.error('Policy not found for ID:', req.body.policyProductId);
        return res.status(404).json({ success: false, message: 'Policy not found' });
      }
      console.log('Policy found:', policy);
      const userPolicy = new UserPolicy({
        userId: req.user.userId,
        policyProductId: req.body.policyProductId,
        startDate: req.body.startDate,
        endDate: new Date(new Date(req.body.startDate).getTime() + policy.termMonths * 30 * 24 * 60 * 60 * 1000),
        status: 'Pending',
        nominee: req.body.nominee
      });
      await userPolicy.save();
      console.log('User policy saved:', userPolicy);
      res.json({ success: true, message: 'Policy purchased successfully', userPolicy });
    } catch (err) {
      console.error('Error in purchasePolicy:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Make payment for a policy
  async makePayment(req, res) {
    try {
      const { error } = paymentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }
      const userPolicy = await UserPolicy.findById(req.body.userPolicyId);
      if (!userPolicy) {
        return res.status(404).json({ success: false, message: 'User policy not found' });
      }
      const payment = new Payment({
        userId: req.user.userId,
        userPolicyId: req.body.userPolicyId,
        amount: req.body.amount,
        method: req.body.method,
        reference: req.body.reference
      });
      await payment.save();
      res.json({ success: true, message: 'Payment successful', payment });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // View payment history
  async paymentHistory(req, res) {
    const payments = await Payment.find({ userId: req.user.userId }).populate('userPolicyId');
    res.json({ success: true, payments });
  },

  // View purchased policies
  async myPolicies(req, res) {
    try {
      console.log('=== CUSTOMER MY POLICIES REQUEST ===');
      console.log('User info:', req.user);
      
      const policies = await UserPolicy.find({ userId: req.user.userId }).populate('policyProductId');
      console.log('Found user policies:', policies.length);
      
      const result = policies.map(p => ({
        userPolicyId: p._id,
        status: p.status,
        verificationType: p.verificationType,
        policy: p.policyProductId,
        startDate: p.startDate,
        endDate: p.endDate,
        nominee: p.nominee
      }));
      
      res.json({ success: true, policies: result });
    } catch (err) {
      console.error('Error in myPolicies:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Cancel a policy
  async cancelPolicy(req, res) {
    try {
      const { userPolicyId } = req.body;
      const userId = req.user.userId;

      // Find the user policy and ensure it belongs to the authenticated user
      const userPolicy = await UserPolicy.findOne({
        _id: userPolicyId,
        userId: userId
      });

      if (!userPolicy) {
        return res.status(404).json({ 
          success: false, 
          message: 'User policy not found or you do not have permission to cancel this policy' 
        });
      }

      if (userPolicy.status === 'Cancelled') {
        return res.status(400).json({ 
          success: false, 
          message: 'Policy is already cancelled.' 
        });
      }

      if (userPolicy.status !== 'Approved') {
        return res.status(400).json({ 
          success: false, 
          message: 'Only approved policies can be cancelled.' 
        });
      }

      // Update policy status to cancelled
      userPolicy.status = 'Cancelled';
      await userPolicy.save();

      res.json({
        success: true,
        userPolicyId: userPolicy._id,
        status: userPolicy.status,
        message: 'Policy cancelled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error cancelling policy',
        error: error.message
      });
    }
  },
    // Get a policy by its ID (customer)
  async getPolicyById(req, res) {
    try {
      const { id } = req.params;
      const policy = await PolicyProduct.findById(id);
      if (!policy) {
        return res.status(404).json({ success: false, message: 'Policy not found' });
      }
      res.json({ success: true, policy });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Get approved policies for the customer
  async getApprovedPolicies(req, res) {
    try {
      const approvedPolicies = await UserPolicy.find({ userId: req.user.userId, approved: true })
        .populate('policyProductId');
      res.json({ success: true, policies: approvedPolicies });
    } catch (err) {
      console.error('Error fetching approved policies:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Get policies with completed payments (claimable policies)
  async getClaimablePolicies(req, res) {
    try {
      console.log('=== GET CLAIMABLE POLICIES ===');
      console.log('User ID:', req.user.userId);

      // Get all payments for the user (all payments are considered completed)
      const userPayments = await Payment.find({ 
        userId: req.user.userId
      }).populate({
        path: 'userPolicyId',
        populate: {
          path: 'policyProductId'
        }
      });

      console.log('User payments found:', userPayments.length);

      // Extract unique policy IDs from payments
      const policyIds = [...new Set(userPayments
        .filter(payment => payment.userPolicyId) // Ensure userPolicyId exists
        .map(payment => payment.userPolicyId._id.toString()))];
      console.log('Unique policy IDs with payments:', policyIds.length);

      // Get approved policies that have payments
      const claimablePolicies = await UserPolicy.find({
        _id: { $in: policyIds },
        userId: req.user.userId,
        approved: true
      }).populate('policyProductId');

      console.log('Claimable policies found:', claimablePolicies.length);
      
      res.json({ success: true, policies: claimablePolicies });
    } catch (err) {
      console.error('Error fetching claimable policies:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Get all claims for the customer
  async getMyClaims(req, res) {
    try {
      console.log('=== GET MY CLAIMS REQUEST ===');
      console.log('User:', req.user);

      const Claim = (await import('../models/claim.js')).default;
      const claims = await Claim.find({ userId: req.user.userId })
        .populate('userId', 'name email')
        .populate({
          path: 'userPolicyId',
          populate: {
            path: 'policyProductId',
            select: 'title code premium description'
          }
        })
        .populate('decidedByAgentId', 'name email')
        .sort({ createdAt: -1 });

      console.log(`Found ${claims.length} claims for user ${req.user.userId}`);

      // Calculate claim statistics
      const stats = {
        totalClaims: claims.length,
        pendingClaims: claims.filter(claim => claim.status === 'Pending').length,
        approvedClaims: claims.filter(claim => claim.status === 'Approved').length,
        rejectedClaims: claims.filter(claim => claim.status === 'Rejected').length,
        totalAmountClaimed: claims.reduce((sum, claim) => sum + (claim.amountClaimed || 0), 0),
        approvedAmount: claims
          .filter(claim => claim.status === 'Approved')
          .reduce((sum, claim) => sum + (claim.amountClaimed || 0), 0)
      };

      res.json({ 
        success: true, 
        claims,
        stats
      });

    } catch (err) {
      console.error('Error in getMyClaims:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching claims',
        error: err.message 
      });
    }
  }
};

export default customerController;
