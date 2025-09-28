import PolicyProduct from '../models/policyProduct.js';
import Agent from '../models/agent.js';

/**
 * Assign an agent to a policy product.
 * @param {String} policyProductId - The ID of the policy product
 * @param {String} agentId - The ID of the agent
 * @returns {Promise<Object>} - The updated policy product
 */
export async function assignAgentToPolicy(policyProductId, agentId) {
  const policyProduct = await PolicyProduct.findById(policyProductId);
  if (!policyProduct) throw new Error('Policy product not found');

  const agent = await Agent.findById(agentId);
  if (!agent) throw new Error('Agent not found');

  policyProduct.assignedAgentId = agentId;
  policyProduct.assignedAgentName = agent.name;
  await policyProduct.save();
  return policyProduct;
}
