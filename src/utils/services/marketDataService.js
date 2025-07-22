/**
 * @module MarketDataService
 * @description Service for fetching and managing market data from exchanges.
 */

const logger = require('../logger');

class MarketDataService {
    constructor(exchange) {
        this.exchange = exchange;
        this.cache = new Map();
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
            const data = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
            logger.debug(`Fetched ${data.length} candles for ${symbol} ${timeframe}`);
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
            const ticker = await this.exchange.fetchTicker(symbol);
            logger.debug(`Fetched ticker for ${symbol}: ${ticker.last}`);
            return ticker;
        } catch (error) {
            logger.error(`Error fetching ticker for ${symbol}: ${error.message}`);
            throw error;
        }
    }
}

module.exports = MarketDataService;
  