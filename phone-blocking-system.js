/**
 * Phone Number Blocking System
 * Prevents account creation and data orders for blacklisted phone numbers
 */

const admin = require('firebase-admin');

/**
 * Normalize phone number by removing all non-digit characters
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '');
}

/**
 * Check if a phone number is blocked
 */
async function isPhoneBlocked(phoneNumber) {
  try {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized) return false;

    const blockedRef = admin.database().ref('blockedPhones');
    const snapshot = await blockedRef.once('value');
    const blockedPhones = snapshot.val() || {};

    const isBlocked = blockedPhones.hasOwnProperty(normalized);
    
    if (isBlocked) {
      console.log(`🚫 Phone ${phoneNumber} (${normalized}) is BLOCKED`);
      return {
        blocked: true,
        reason: blockedPhones[normalized].reason || 'Phone number is blocked',
        blockedAt: blockedPhones[normalized].blockedAt
      };
    }

    console.log(`✅ Phone ${phoneNumber} (${normalized}) is allowed`);
    return { blocked: false };
  } catch (error) {
    console.error('❌ Error checking blocked phones:', error.message);
    return { blocked: false, error: error.message };
  }
}

/**
 * Add a phone number to the blocklist
 */
async function blockPhoneNumber(phoneNumber, reason = 'Unauthorized usage') {
  try {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized) {
      throw new Error('Invalid phone number');
    }

    const blockedRef = admin.database().ref('blockedPhones').child(normalized);
    await blockedRef.set({
      phone: phoneNumber,
      normalizedPhone: normalized,
      blockedAt: new Date().toISOString(),
      reason: reason,
      blockedBy: 'admin-system'
    });

    console.log(`🚫 Phone ${phoneNumber} successfully added to blocklist`);
    return { success: true, phone: phoneNumber };
  } catch (error) {
    console.error('❌ Error blocking phone:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a phone number from the blocklist
 */
async function unblockPhoneNumber(phoneNumber) {
  try {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized) {
      throw new Error('Invalid phone number');
    }

    await admin.database().ref('blockedPhones').child(normalized).remove();
    console.log(`✅ Phone ${phoneNumber} removed from blocklist`);
    return { success: true, phone: phoneNumber };
  } catch (error) {
    console.error('❌ Error unblocking phone:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get all blocked phone numbers (admin only)
 */
async function getBlockedPhones() {
  try {
    const snapshot = await admin.database().ref('blockedPhones').once('value');
    const blockedPhones = snapshot.val() || {};
    return {
      success: true,
      count: Object.keys(blockedPhones).length,
      phones: blockedPhones
    };
  } catch (error) {
    console.error('❌ Error retrieving blocked phones:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Middleware to validate phone during signup
 */
async function validatePhoneSignup(phoneNumber) {
  // Hardcoded blacklist for specific numbers
  const hardcodedBlacklist = ['0266676258', '0533742701'];
  
  const normalized = normalizePhone(phoneNumber);
  
  // Check hardcoded blacklist first
  if (hardcodedBlacklist.includes(normalized)) {
    return {
      valid: false,
      error: 'This phone number cannot be used to create an account. Contact support if you believe this is an error.'
    };
  }
  
  // Check database blocklist
  const blockCheck = await isPhoneBlocked(phoneNumber);
  
  if (blockCheck.blocked) {
    return {
      valid: false,
      error: 'This phone number cannot be used to create an account. Contact support if you believe this is an error.',
      reason: blockCheck.reason
    };
  }

  return { valid: true };
}

/**
 * Middleware to validate phone during data order/purchase
 */
async function validatePhoneOrder(phoneNumber) {
  const blockCheck = await isPhoneBlocked(phoneNumber);
  
  if (blockCheck.blocked) {
    return {
      valid: false,
      error: 'Data bundle cannot be sent to this phone number. This number is restricted from our service.',
      reason: blockCheck.reason
    };
  }

  return { valid: true };
}

/**
 * Log blocked phone attempt for audit trail
 */
async function logBlockedPhoneAttempt(phoneNumber, action, userId = null, details = {}) {
  try {
    const normalized = normalizePhone(phoneNumber);
    await admin.database().ref('blockedPhoneAttempts').push().set({
      phone: phoneNumber,
      normalizedPhone: normalized,
      action: action, // 'signup', 'order', 'purchase'
      userId: userId,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent,
      details: details
    });

    console.log(`📝 Blocked phone attempt logged: ${phoneNumber} (${action})`);
  } catch (error) {
    console.error('❌ Error logging blocked phone attempt:', error.message);
  }
}

module.exports = {
  normalizePhone,
  isPhoneBlocked,
  blockPhoneNumber,
  unblockPhoneNumber,
  getBlockedPhones,
  validatePhoneSignup,
  validatePhoneOrder,
  logBlockedPhoneAttempt
};
