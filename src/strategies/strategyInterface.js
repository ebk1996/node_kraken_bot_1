/**
 * @module StrategyInterface
 * @description Defines the interface for all trading strategies.
 * All strategies must implement the `run` method.
 */

class StrategyInterface {
    constructor(symbol, config, tradingService) {
        if (new.target === StrategyInterface) {
            throw new TypeError("Cannot construct StrategyInterface instances directly.");
        }
        this.symbol = symbol;
        this.config = config;
        this.tradingService = tradingService;
        this.logger = require('../utils/logger').child({ strategy: this.constructor.name, symbol: symbol });
        this.position = null; // To track current position: { side: 'long'|'short', entryPrice: number, amount: number }
    }

    /**
     * Initializes the strategy. This method should be overridden by concrete strategies.
     * @abstract
     * @returns {Promise<void>}
     */
    async initialize() {
        throw new Error("Method 'initialize()' must be implemented.");
    }

    /**
     * The main logic for the trading strategy.
     * This method will be called periodically with new market data (e.g., new candle).
     * @abstract
     * @param {object} candle - The latest OHLCV candle: { timestamp, open, high, low, close, volume }.
     * @param {Array<object>} historicalData - Array of historical OHLCV candles required for indicator calculation.
     * @returns {Promise<void>}
     */
    async run(candle, historicalData) {
        throw new Error("Method 'run(candle, historicalData)' must be implemented.");
    }

    /**
     * Handles exiting the current position.
     * @param {'long'|'short'} side - The side of the position to exit.
     * @returns {Promise<void>}
     */
    async exitPosition(side) {
        if (!this.position || this.position.side !== side) {
            this.logger.warn(`Attempted to exit ${side} position, but no such position exists.`);
            return;
        }

        const exitSide = side === 'long' ? 'sell' : 'buy';
        this.logger.info(`Attempting to exit ${side} position for ${this.symbol}.`);
        try {
            const order = await this.tradingService.executeTrade(
                this.symbol,
                exitSide,
                this.position.amount,
                'market',
                { strategy: this.constructor.name, type: 'exit' }
            );
            this.logger.info(`Exited ${side} position for ${this.symbol}. Order ID: ${order.id}`);
            this.position = null; // Clear position
        } catch (error) {
            this.logger.error(`Failed to exit ${side} position for ${this.symbol}: ${error.message}`);
        }
    }

    /**
     * Sets the current position.
     * @param {'long'|'short'} side - The side of the new position.
     * @param {number} entryPrice - The entry price of the position.
     * @param {number} amount - The amount of base currency.
     */
    setPosition(side, entryPrice, amount) {
        this.position = { side, entryPrice, amount };
        this.logger.info(`Position set: ${side} ${amount} ${this.symbol} at ${entryPrice}`);
    }

    /**
     * Clears the current position.
     */
    clearPosition() {
        this.position = null;
        this.logger.info(`Position cleared for ${this.symbol}.`);
    }
}

export default StrategyInterface;