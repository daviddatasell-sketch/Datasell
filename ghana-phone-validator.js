/**
 * Ghanaian Phone Number Validation
 * Validates that phone numbers are legitimate Ghanaian numbers
 */

/**
 * Valid Ghanaian mobile networks and their prefixes
 */
const GHANA_NETWORKS = {
  MTN: ['050', '051', '055', '059'],
  VODAFONE: ['020', '024'],
  AIRTELTIGO: ['026', '027'],
  AIRTEL: ['010'],
  GLOTEL: ['091', '092']
};

/**
 * Normalize phone number
 * Accepts formats:
 * - 0XXXXXXXXXX (starts with 0, 10 digits total)
 * - +233XXXXXXXXX (international format, 9 digits after +233)
 * 
 * No network validation - accepts any 10-digit number starting with 0
 * Returns: {valid: boolean, normalized: string, error: string, network: string}
 */
function validateGhanianPhone(phone) {
  if (!phone) {
    return {
      valid: false,
      normalized: null,
      error: 'Phone number is required'
    };
  }

  // Remove spaces, hyphens, and parentheses
  let cleaned = phone.toString().trim().replace(/[\s\-\(\)]/g, '');

  // Case 1: Format +233XXXXXXXXX (international)
  if (cleaned.startsWith('+233')) {
    const digits = cleaned.substring(4); // Get digits after +233
    
    if (!/^\d{9}$/.test(digits)) {
      return {
        valid: false,
        normalized: null,
        error: 'Invalid phone format. Use +233 followed by 9 digits (e.g., +233501234567)'
      };
    }

    const normalized = '0' + digits; // Convert to 0XXXXXXXXX format

    return {
      valid: true,
      normalized: normalized,
      network: 'Unknown' // No network validation
    };
  }

  // Case 2: Format 0XXXXXXXXXX (local)
  if (cleaned.startsWith('0')) {
    if (!/^\d{10}$/.test(cleaned)) {
      return {
        valid: false,
        normalized: null,
        error: 'Phone number must be exactly 10 digits starting with 0 (e.g., 0501234567)'
      };
    }

    return {
      valid: true,
      normalized: cleaned,
      network: 'Unknown' // No network validation
    };
  }

  // Invalid format
  return {
    valid: false,
    normalized: null,
    error: 'Phone number must start with 0 (local) or +233 (international). Example: 0501234567 or +233501234567'
  };
}

/**
 * Check if phone number belongs to a valid Ghanaian network
 */
function isValidGhanianNetwork(normalizedPhone) {
  if (!normalizedPhone || !normalizedPhone.startsWith('0')) {
    return false;
  }

  const prefix = normalizedPhone.substring(0, 3);

  // Check against all known networks
  for (const network of Object.values(GHANA_NETWORKS)) {
    if (network.includes(prefix)) {
      return true;
    }
  }

  return false;
}

/**
 * Get network name from phone number
 */
function getNetworkName(normalizedPhone) {
  const prefix = normalizedPhone.substring(0, 3);

  for (const [network, prefixes] of Object.entries(GHANA_NETWORKS)) {
    if (prefixes.includes(prefix)) {
      return network;
    }
  }

  return 'Unknown';
}

/**
 * Convert Ghanaian phone to international format
 */
function toInternationalFormat(normalizedPhone) {
  if (!normalizedPhone.startsWith('0')) {
    return normalizedPhone;
  }
  return '+233' + normalizedPhone.substring(1);
}

/**
 * Convert international format to local format
 */
function toLocalFormat(internationalPhone) {
  if (internationalPhone.startsWith('+233')) {
    return '0' + internationalPhone.substring(4);
  }
  return internationalPhone;
}

module.exports = {
  validateGhanianPhone,
  isValidGhanianNetwork,
  getNetworkName,
  toInternationalFormat,
  toLocalFormat,
  GHANA_NETWORKS
};
