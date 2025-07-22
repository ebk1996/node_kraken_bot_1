/**
 * @module MarketDataService
 * @description Service for fetching and managing market data from exchanges.
 */

import logger from '../utils/logger.js';

class MarketDataService {
    constructor(exchange) {
        this.exchange = exchange;
        this.cache = new Map();
        this.subscribers = new Map(); // For real-time data subscriptions
    }

    /**
     * Fetches OHLCV data for a symbol.
     * @param {string} symbol - Trading pair symbol
     * @param {string} timeframe - Timeframe (1m, 5m, 1h, etc.)
     * @param {number} limit - Number of candles to fetch
     * @returns {Promise<Array>} Array of OHLCV candles
     */
    async fetchOHLCV(symbol, timeframe = '1h', limit = 100) {
        try {
            if (!this.exchange) {
                throw new Error('Exchange not initialized');
            }
            
            const data = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
            logger.debug(`Fetched ${data.length} candles for ${symbol} ${timeframe}`);
            
            // Cache the data
            const cacheKey = `${symbol}-${timeframe}`;
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            logger.error(`Error fetching OHLCV for ${symbol}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Fetches current ticker data.
     * @param {string} symbol - Trading pair symbol
     * @returns {Promise<object>} Ticker data
     */
    async fetchTicker(symbol) {
        try {
            if (!this.exchange) {
                throw new Error('Exchange not initialized');
            }
            
            const ticker = await this.exchange.fetchTicker(symbol);
            logger.debug(`Fetched ticker for ${symbol}: ${ticker.last}`);
            return ticker;
        } catch (error) {
            logger.error(`Error fetching ticker for ${symbol}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gets cached data if available and not expired.
     * @param {string} symbol - Trading pair symbol
     * @param {string} timeframe - Timeframe
     * @param {number} maxAge - Maximum age in milliseconds (default: 5 minutes)
     * @returns {Array|null} Cached OHLCV data or null
     */
    getCachedOHLCV(symbol, timeframe, maxAge = 300000) {
        const cacheKey = `${symbol}-${timeframe}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < maxAge) {
            logger.debug(`Using cached data for ${symbol} ${timeframe}`);
            return cached.data;
        }
        
        return null;
    }

    /**
     * Fetches order book data.
     * @param {string} symbol - Trading pair symbol
     * @param {number} limit - Number of orders per side
     * @returns {Promise<object>} Order book data
     */
    async fetchOrderBook(symbol, limit = 10) {
        try {
            if (!this.exchange) {
                throw new Error('Exchange not initialized');
            }
            
            const orderBook = await this.exchange.fetchOrderBook(symbol, limit);
            logger.debug(`Fetched order book for ${symbol}`);
            return orderBook;
        } catch (error) {
            logger.error(`Error fetching order book for ${symbol}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clears the cache.
     */
    clearCache() {
        this.cache.clear();
        logger.debug('Market data cache cleared');
    }
}

export default MarketDataService;
