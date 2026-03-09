// DataHub Ghana API Integration Module
// Handles AT (AirtelTigo) and Telecel packages
// Documentation: https://app.datahubgh.com/docs/api

const axios = require('axios');

const DATAHUB_CONFIG = {
  BASE_URL: 'https://app.datahubgh.com/api/external',
  API_KEY: process.env.DATAHUB_API_KEY,
  
  // Network mappings for DataHub
  NETWORKS: {
    'at': 'AT_PREMIUM',       // AirtelTigo Premium
    'airteltigo': 'AT_PREMIUM',
    'tc': 'TELECEL',          // Telecel
    'telecel': 'TELECEL'
  },
  
  // Order statuses from DataHub
  ORDER_STATUSES: {
    INITIATED: 'initiated',
    PENDING: 'pending',
    PROCESSING: 'processing',
    SUCCESSFUL: 'successful',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  },
  
  // Rate limits: 60/min, 1000/hour, 10000/day
  RATE_LIMITS: {
    PER_MINUTE: 60,
    PER_HOUR: 1000,
    PER_DAY: 10000
  }
};

/**
 * Check if a network should be routed to DataHub
 * @param {string} network - Network code (mtn, at, tc)
 * @returns {boolean}
 */
function shouldUseDataHub(network) {
  if (!network) return false;
  const net = network.toLowerCase();
  return net === 'at' || net === 'airteltigo' || net === 'tc' || net === 'telecel';
}

/**
 * Check if a network should be routed to DataMart (only MTN)
 * @param {string} network - Network code
 * @returns {boolean}
 */
function shouldUseDataMart(network) {
  if (!network) return false;
  return network.toLowerCase() === 'mtn';
}

/**
 * Map internal network name to DataHub network key
 * @param {string} network - Network code
 * @returns {string} DataHub network key
 */
function mapNetworkToDataHub(network) {
  if (!network) return null;
  return DATAHUB_CONFIG.NETWORKS[network.toLowerCase()] || null;
}

/**
 * Purchase data via DataHub API
 * @param {object} params - Purchase parameters
 * @param {string} params.networkKey - DataHub network key (AT_PREMIUM, TELECEL)
 * @param {string} params.recipient - Phone number (10 digits)
 * @param {string} params.capacity - Data capacity in GB (as string: "1", "2", etc)
 * @returns {Promise<object>} DataHub response
 */
async function purchaseViaDataHub(params) {
  try {
    const { networkKey, recipient, capacity } = params;
    
    if (!networkKey || !recipient || !capacity) {
      throw new Error('Missing required parameters: networkKey, recipient, capacity');
    }

    console.log('📡 [DataHub] Initiating purchase:', {
      networkKey,
      recipient,
      capacity
    });

    const response = await axios.post(
      `${DATAHUB_CONFIG.BASE_URL}/data-purchase`,
      {
        networkKey: networkKey,
        recipient: recipient,
        capacity: capacity
      },
      {
        headers: {
          'X-API-Key': DATAHUB_CONFIG.API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ [DataHub] Purchase response:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ [DataHub] Purchase error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
}

/**
 * Check order status via DataHub API
 * @param {string} orderNumber - Order number from DataHub
 * @returns {Promise<object>} Order status details
 */
async function checkOrderStatus(orderNumber) {
  try {
    if (!orderNumber) {
      throw new Error('Order number is required');
    }

    console.log('🔍 [DataHub] Checking order status:', orderNumber);

    const response = await axios.get(
      `${DATAHUB_CONFIG.BASE_URL}/order/${orderNumber}`,
      {
        headers: {
          'X-API-Key': DATAHUB_CONFIG.API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ [DataHub] Order status response:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ [DataHub] Status check error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
}

/**
 * Handle DataHub webhook notification
 * @param {object} webhookData - Data from DataHub webhook
 * @returns {object} Processed webhook data
 */
function parseDataHubWebhook(webhookData) {
  try {
    if (!webhookData) {
      throw new Error('No webhook data provided');
    }

    console.log('📨 [DataHub] Raw webhook data received:', JSON.stringify(webhookData, null, 2));

    // Support multiple possible field names for order number
    const orderNumber = webhookData.orderNumber || webhookData.order_number || webhookData.orderId || webhookData.order?.id || webhookData.id;
    
    // Support multiple possible field names for status
    const status = (webhookData.status || webhookData.order_status || webhookData.orderStatus || '')?.toLowerCase();

    // DataHub webhook structure based on API docs
    const parsed = {
      orderNumber: orderNumber,
      status: status,
      network: webhookData.network || webhookData.provider,
      recipient: webhookData.recipient || webhookData.phoneNumber || webhookData.phone_number,
      capacity: webhookData.capacity || webhookData.volume || webhookData.data_volume,
      price: webhookData.price || webhookData.amount,
      balance: webhookData.balance || webhookData.remaining_balance,
      timestamp: webhookData.timestamp || new Date().toISOString(),
      rawData: webhookData
    };

    console.log('✅ [DataHub] Webhook parsed:', parsed);
    return parsed;

  } catch (error) {
    console.error('❌ [DataHub] Webhook parse error:', error);
    throw error;
  }
}

/**
 * Verify DataHub webhook authenticity (if needed)
 * @param {string} signature - Webhook signature from header
 * @param {string} payload - Raw webhook payload
 * @returns {boolean} Is webhook authentic
 */
function verifyDataHubWebhook(signature, payload) {
  // DataHub may use hmac signatures - add verification if provided
  // For now, returning true as DataHub docs don't specify signature verification
  return true;
}

module.exports = {
  DATAHUB_CONFIG,
  shouldUseDataHub,
  shouldUseDataMart,
  mapNetworkToDataHub,
  purchaseViaDataHub,
  checkOrderStatus,
  parseDataHubWebhook,
  verifyDataHubWebhook
};
