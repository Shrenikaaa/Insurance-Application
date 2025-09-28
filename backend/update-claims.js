import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import the Claim model
import Claim from './src/models/claim.js';

const updateClaims = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');

    // Find all claims that don't have incidentType or have null/undefined incidentType
    const claimsToUpdate = await Claim.find({
      $or: [
        { incidentType: { $exists: false } },
        { incidentType: null },
        { incidentType: "" }
      ]
    });

    console.log(`Found ${claimsToUpdate.length} claims to update`);

    if (claimsToUpdate.length === 0) {
      console.log('No claims need updating');
      return;
    }

    // Update each claim with a default incident type based on description or amount
    for (let claim of claimsToUpdate) {
      let incidentType = 'Other'; // default

      // Try to guess incident type from description
      const description = (claim.description || '').toLowerCase();
      if (description.includes('accident') || description.includes('collision')) {
        incidentType = 'Accident';
      } else if (description.includes('theft') || description.includes('stolen')) {
        incidentType = 'Theft';
      } else if (description.includes('fire') || description.includes('burn')) {
        incidentType = 'Fire';
      } else if (description.includes('flood') || description.includes('storm') || description.includes('earthquake')) {
        incidentType = 'Natural Disaster';
      } else if (description.includes('medical') || description.includes('health') || description.includes('hospital')) {
        incidentType = 'Medical Emergency';
      } else if (description.includes('damage') || description.includes('broken')) {
        incidentType = 'Property Damage';
      }

      // Update the claim
      await Claim.findByIdAndUpdate(claim._id, { incidentType });
      console.log(`Updated claim ${claim._id} with incident type: ${incidentType}`);
    }

    console.log('All claims updated successfully');

  } catch (error) {
    console.error('Error updating claims:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the update
updateClaims();