import ccxt from 'ccxt';
import logger from '../utils/logger.js';

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
            enableRateLimit: true,
            sandbox: false // Set to true for testing
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
        throw new Error('Kraken exchange not initialized for live trading.');
    }
    
    try {
        const balance = await exchange.fetchBalance();
        return balance.free && balance.free[currency] ? balance.free[currency] : 0;
    } catch (error) {
        logger.error(`Error fetching balance for ${currency}: ${error.message}`);
        throw error;
    }
}

/**
 * Fetches the current ticker (price) for a trading pair.
 * @param {string} symbol - The trading pair (e.g., 'BTC/USD').
 * @returns {Promise<object>} Ticker information including bid, ask, last price.
 */
async function getTicker(symbol) {
    if (!exchange) {
        // For paper trading, return mock ticker data
        return {
            symbol: symbol,
            bid: 50000,
            ask: 50100,
            last: 50050,
            change: 0.01,
            percentage: 0.02,
            datetime: new Date().toISOString()
        };
    }
    
    try {
        const ticker = await exchange.fetchTicker(symbol);
        return ticker;
    } catch (error) {
        logger.error(`Error fetching ticker for ${symbol}: ${error.message}`);
        throw error;
    }
}

/**
 * Fetches OHLCV (candlestick) data for a trading pair.
 * @param {string} symbol - The trading pair (e.g., 'BTC/USD').
 * @param {string} timeframe - The timeframe (e.g., '1h', '1d').
 * @param {number} limit - Number of candles to fetch.
 * @returns {Promise<Array>} Array of OHLCV data.
 */
async function fetchOHLCV(symbol, timeframe = '1h', limit = 100) {
    if (!exchange) {
        // For paper trading, return mock OHLCV data
        const mockData = [];
        const now = Date.now();
        const timeframeMs = getTimeframeInMs(timeframe);
        
        for (let i = limit - 1; i >= 0; i--) {
            const timestamp = now - (i * timeframeMs);
            const basePrice = 50000;
            const open = basePrice + (Math.random() - 0.5) * 1000;
            const close = open + (Math.random() - 0.5) * 500;
            const high = Math.max(open, close) + Math.random() * 200;
            const low = Math.min(open, close) - Math.random() * 200;
            const volume = Math.random() * 100;
            
            mockData.push([timestamp, open, high, low, close, volume]);
        }
        
        return mockData;
    }
    
    try {
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
        return ohlcv;
    } catch (error) {
        logger.error(`Error fetching OHLCV for ${symbol}: ${error.message}`);
        throw error;
    }
}

/**
 * Places a market order.
 * @param {string} symbol - The trading pair.
 * @param {'buy'|'sell'} side - Order side.
 * @param {number} amount - Amount to trade.
 * @returns {Promise<object>} Order result.
 */
async function createMarketOrder(symbol, side, amount) {
    if (!exchange) {
        throw new Error('Kraken exchange not initialized for live trading.');
    }
    
    try {
        const order = await exchange.createMarketOrder(symbol, side, amount);
        logger.info(`Market order created: ${side} ${amount} ${symbol}`);
        return order;
    } catch (error) {
        logger.error(`Error creating market order: ${error.message}`);
        throw error;
    }
}

/**
 * Places a limit order.
 * @param {string} symbol - The trading pair.
 * @param {'buy'|'sell'} side - Order side.
 * @param {number} amount - Amount to trade.
 * @param {number} price - Limit price.
 * @returns {Promise<object>} Order result.
 */
async function createLimitOrder(symbol, side, amount, price) {
    if (!exchange) {
        throw new Error('Kraken exchange not initialized for live trading.');
    }
    
    try {
        const order = await exchange.createLimitOrder(symbol, side, amount, price);
        logger.info(`Limit order created: ${side} ${amount} ${symbol} at ${price}`);
        return order;
    } catch (error) {
        logger.error(`Error creating limit order: ${error.message}`);
        throw error;
    }
}

/**
 * Converts timeframe string to milliseconds.
 * @param {string} timeframe - Timeframe string (e.g., '1h', '1d').
 * @returns {number} Timeframe in milliseconds.
 */
function getTimeframeInMs(timeframe) {
    const timeframes = {
        '1m': 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000
    };
    
    if (!timeframes[timeframe]) {
        logger.warn(`Unknown timeframe '${timeframe}' provided. Defaulting to '1h'.`);
    }
    return timeframes[timeframe] || timeframes['1h'];
}

export { initializeKraken, getBalance, getTicker, fetchOHLCV, createMarketOrder, createLimitOrder, getTimeframeInMs };
