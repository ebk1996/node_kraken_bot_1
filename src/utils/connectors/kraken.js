const ccxt = require('ccxt');
const logger = require('../utils/logger');
const config = require('../../config/default.json');

/**
 * @module KrakenConnector
 * @description Handles all interactions with the Kraken exchange API using CCXT.
 */

let exchange;

/**
 * Initializes the Kraken exchange connector.
 * @param {string} apiKey - Kraken API Key.
 * @param {string} secret - Kraken API Secret.
 * @param {boolean} isPaperTrading - True if in paper trading mode, false for live.
 */
function initializeKraken(apiKey, secret, isPaperTrading = false) {
    if (isPaperTrading) {
        logger.info('Kraken connector initialized in paper trading mode. No real API calls will be made.');
        exchange = null; // No real exchange connection needed
        return;
    }

    try {
        exchange = new ccxt.kraken({
            apiKey: apiKey,
            secret: secret,
            enableRateLimit: true, // Enable built-in rate limiting
            options: {
                // Adjust for Kraken's private API path
                // 'fetchOrderTrades' path: '/0/private/Trades'
                // 'addOrder' path: '/0/private/AddOrder'
                // 'cancelOrder' path: '/0/private/CancelOrder'
                // 'fetchBalance' path: '/0/private/Balance'
            }
        });
        logger.info('Kraken connector initialized for live trading.');
    } catch (error) {
        logger.error(`Failed to initialize Kraken connector: ${error.message}`);
        throw new Error('Kraken API initialization failed.');
    }
}

/**
 * Fetches the current balance for a given currency.
 * @param {string} currency - The currency to check balance for (e.g., 'USD', 'BTC').
 * @returns {Promise<number>} The available balance.
 */
async function getBalance(currency) {
    if (!exchange) {
        logger.warn('Kraken connector not initialized. Returning simulated balance.');
        // In paper trading, you'd get this from the paper trading module
        return 10000; // Example simulated balance
    }
    try {
        const balance = await exchange.fetchBalance();
        const available = balance.free[currency] || 0;
        logger.debug(`Fetched balance for ${currency}: ${available}`);
        return available;
    } catch (error) {
        logger.error(`Error fetching balance for ${currency}: ${error.message}`);
        throw error;
    }
}

/**
 * Fetches current OHLCV (candlestick) data.
 * @param {string} symbol - The trading pair (e.g., 'BTC/USD').
 * @param {string} timeframe - The candlestick timeframe (e.g., '1m', '5m', '1h').
 * @param {number} [limit=100] - Number of candles to fetch.
 * @returns {Promise<Array<Array<number>>>} OHLCV data.
 */
async function fetchOHLCV(symbol, timeframe, limit = 100) {
    if (!exchange) {
        logger.warn('Kraken connector not initialized. Cannot fetch OHLCV data.');
        return [];
    }
    try {
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
        logger.debug(`Fetched ${ohlcv.length} OHLCV candles for ${symbol} ${timeframe}.`);
        return ohlcv;
    } catch (error) {
        logger.error(`Error fetching OHLCV for ${symbol} ${timeframe}: ${error.message}`);
        throw error;
    }
}

/**
 * Places a market order.
 * @param {string} symbol - The trading pair (e.g., 'BTC/USD').
 * @param {'buy'|'sell'} side - Order side.
 * @param {number} amount - Amount to trade in base currency.
 * @returns {Promise<object>} Order details.
 */
async function createMarketOrder(symbol, side, amount) {
    if (!exchange) {
        logger.warn(`Kraken connector not initialized. Simulating market ${side} order for ${amount} ${symbol}.`);
        // In paper trading, this would interact with the paper trading module
        return {
            id: 'simulated-order-' + Date.now(),
            symbol: symbol,
            side: side,
            type: 'market',
            amount: amount,
            price: await getTicker(symbol).then(t => side === 'buy' ? t.ask : t.bid), // Simulate price
            status: 'closed',
            datetime: new Date().toISOString()
        };
    }

    try {
        const order = await exchange.createMarketOrder(symbol, side, amount);
        logger.info(`Market ${side} order placed for ${amount} ${symbol}. Order ID: ${order.id}`);
        return order;
    } catch (error) {
        logger.error(`Error placing market ${side} order for ${amount} ${symbol}: ${error.message}`);
        throw error;
    }
}

/**
 * Places a limit order.
 * @param {string} symbol - The trading pair (e.g., 'BTC/USD').
 * @param {'buy'|'sell'} side - Order side.
 * @param {number} amount - Amount to trade in base currency.
 * @param {number} price - Price at which to place the limit order.
 * @returns {Promise<object>} Order details.
 */
async function createLimitOrder(symbol, side, amount, price) {
    if (!exchange) {
        logger.warn(`Kraken connector not initialized. Simulating limit ${side} order for ${amount} ${symbol} at ${price}.`);
        return {
            id: 'simulated-order-' + Date.now(),
            symbol: symbol,
            side: side,
            type: 'limit',
            amount: amount,
            price: price,
            status: 'open',
            datetime: new Date().toISOString()
        };
    }
    try {
        const order = await exchange.createLimitOrder(symbol, side, amount, price);
        logger.info(`Limit ${side} order placed for ${amount} ${symbol} at ${price}. Order ID: ${order.id}`);
        return order;
    } catch (error) {
        logger.error(`Error placing limit ${side} order for ${amount} ${symbol} at ${price}: ${error.message}`);
        throw error;
    }
}

/**
 * Cancels an order.
 * @param {string} orderId - The ID of the order to cancel.
 * @param {string} symbol - The trading pair of the order.
 * @returns {Promise<object>} Cancellation details.
 */
async function cancelOrder(orderId, symbol) {
    if (!exchange) {
        logger.warn(`Kraken connector not initialized. Simulating cancellation of order ${orderId}.`);
        return { id: orderId, status: 'canceled' };
    }
    try {
        const result = await exchange.cancelOrder(orderId, symbol);
        logger.info(`Order ${orderId} for ${symbol} cancelled.`);
        return result;
    } catch (error) {
        logger.error(`Error cancelling order ${orderId} for ${symbol}: ${error.message}`);
        throw error;
    }
}

/**
 * Fetches a single ticker for a symbol.
 * @param {string} symbol - The trading pair (e.g., 'BTC/USD').
 * @returns {Promise<object>} Ticker information (bid, ask, last, etc.).
 */
async function getTicker(symbol) {
    if (!exchange) {
        logger.warn(`Kraken connector not initialized. Simulating ticker for ${symbol}.`);
        // Return some dummy data for paper trading, or fetch from paperTrader
        return {
            symbol: symbol,
            bid: 40000,
            ask: 40001,
            last: 40000.5,
            high: 40500,
            low: 39500,
            volume: 100
        };
    }
    try {
        const ticker = await exchange.fetchTicker(symbol);
        logger.debug(`Fetched ticker for ${symbol}: ${ticker.last}`);
        return ticker;
    } catch (error) {
        logger.error(`Error fetching ticker for ${symbol}: ${error.message}`);
        throw error;
    }
}

/**
 * Fetches all open orders.
 * @param {string} symbol - The trading pair (e.g., 'BTC/USD').
 * @returns {Promise<Array<object>>} List of open orders.
 */
async function fetchOpenOrders(symbol = undefined) {
    if (!exchange) {
        logger.warn('Kraken connector not initialized. Returning empty array for open orders.');
        return [];
    }
    try {
        const orders = await exchange.fetchOpenOrders(symbol);
        logger.debug(`Fetched ${orders.length} open orders for ${symbol || 'all symbols'}.`);
        return orders;
    } catch (error) {
        logger.error(`Error fetching open orders for ${symbol || 'all symbols'}: ${error.message}`);
        throw error;
    }
}

/**
 * Fetches an order by ID.
 * @param {string} orderId - The ID of the order.
 * @param {string} symbol - The trading pair.
 * @returns {Promise<object>} Order details.
 */
async function fetchOrder(orderId, symbol) {
    if (!exchange) {
        logger.warn(`Kraken connector not initialized. Cannot fetch order ${orderId}.`);
        return null;
    }
    try {
        const order = await exchange.fetchOrder(orderId, symbol);
        logger.debug(`Fetched order ${orderId}: ${order.status}`);
        return order;
    } catch (error) {
        logger.error(`Error fetching order ${orderId}: ${error.message}`);
        throw error;
    }
}

module.exports = {
    initializeKraken,
    getBalance,
    fetchOHLCV,
    createMarketOrder,
    createLimitOrder,
    cancelOrder,
    getTicker,
    fetchOpenOrders,
    fetchOrder
};