/**
 * Admin Endpoints for Phone Blocking Management
 * Add this to server.js to enable admin phone management
 */

const {
  blockPhoneNumber,
  unblockPhoneNumber,
  getBlockedPhones
} = require('./phone-blocking-system');

// Apply these routes after your requireAdmin middleware definition

/**
 * GET /api/admin/blocked-phones
 * Retrieve all blocked phone numbers
 */
async function handleGetBlockedPhones(req, res) {
  try {
    const result = await getBlockedPhones();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      count: result.count,
      phones: result.phones || {}
    });
  } catch (error) {
    console.error('❌ Error retrieving blocked phones:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/admin/block-phone
 * Block a phone number (admin only)
 * Body: { phone: string, reason: string }
 */
async function handleBlockPhone(req, res) {
  try {
    const { phone, reason } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const result = await blockPhoneNumber(phone, reason || 'Admin block');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // Log the action
    await admin.database().ref('adminLogs').push().set({
      action: 'PHONE_BLOCKED',
      timestamp: new Date().toISOString(),
      phone: phone,
      reason: reason || 'Admin block',
      adminEmail: req.session.user.email
    });

    res.json({
      success: true,
      message: `Phone ${phone} has been blocked`,
      phone: phone
    });
  } catch (error) {
    console.error('❌ Error blocking phone:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/admin/unblock-phone
 * Unblock a phone number (admin only)
 * Body: { phone: string }
 */
async function handleUnblockPhone(req, res) {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const result = await unblockPhoneNumber(phone);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // Log the action
    await admin.database().ref('adminLogs').push().set({
      action: 'PHONE_UNBLOCKED',
      timestamp: new Date().toISOString(),
      phone: phone,
      adminEmail: req.session.user.email
    });

    res.json({
      success: true,
      message: `Phone ${phone} has been unblocked`,
      phone: phone
    });
  } catch (error) {
    console.error('❌ Error unblocking phone:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/admin/blocked-phone-attempts
 * View all blocked phone access attempts (audit trail)
 */
async function handleBlockedPhoneAttempts(req, res) {
  try {
    const snapshot = await admin.database().ref('blockedPhoneAttempts').once('value');
    const attempts = snapshot.val() || {};

    // Convert to array and sort by timestamp (newest first)
    const attemptsArray = Object.entries(attempts).map(([key, value]) => ({
      id: key,
      ...value
    })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      count: attemptsArray.length,
      attempts: attemptsArray
    });
  } catch (error) {
    console.error('❌ Error retrieving blocked phone attempts:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  handleGetBlockedPhones,
  handleBlockPhone,
  handleUnblockPhone,
  handleBlockedPhoneAttempts
};
