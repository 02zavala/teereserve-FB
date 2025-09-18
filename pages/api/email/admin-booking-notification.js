import { sendAdminBookingNotification } from '../../../src/lib/email';
import { auth as adminAuth } from '../../../src/lib/firebase-admin';

// Helper function to verify token
const verifyIdToken = async (token) => {
  if (!adminAuth) {
    throw new Error("Firebase Admin SDK not initialized.");
  }
  return await adminAuth.verifyIdToken(token);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { adminEmail, bookingDetails, idToken } = req.body;

    // Verify authentication
    if (!idToken) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    await verifyIdToken(idToken);

    // Validate required data
    if (!adminEmail || !bookingDetails) {
      return res.status(400).json({ 
        error: 'Missing required fields: adminEmail and bookingDetails are required' 
      });
    }

    // Validate booking details structure
    const requiredFields = ['courseName', 'date', 'time', 'players'];
    for (const field of requiredFields) {
      if (!bookingDetails[field]) {
        return res.status(400).json({ 
          error: `Missing required booking field: ${field}` 
        });
      }
    }

    // Send admin notification email
    const result = await sendAdminBookingNotification(adminEmail, bookingDetails);

    if (result.success) {
      res.status(200).json({ 
        success: true, 
        message: 'Admin notification sent successfully',
        emailId: result.data?.id 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send admin notification', 
        details: result.error 
      });
    }

  } catch (error) {
    console.error('Error in admin booking notification API:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}