import { EMA, RSI, MACD } from 'technicalindicators'; // Using technicalindicators for simplicity
import logger from '../utils/logger.js';

/**
 * @module IndicatorUtils
 * @description Provides utility functions to calculate technical indicators.
 * Uses the 'technicalindicators' library.
 */

/**
 * Calculates Exponential Moving Average (EMA).
 * @param {Array<number>} prices - Array of closing prices.
 * @param {number} period - The EMA period.
 * @returns {Array<number>} Array of EMA values.
 */
function calculateEMA(prices, period) {
    if (prices.length < period) {
        logger.warn(`Not enough data to calculate EMA (need ${period}, got ${prices.length}).`);
        return [];
    }
    try {
        const ema = EMA.calculate({ period, values: prices });
        return ema;
    } catch (error) {
        logger.error(`Error calculating EMA: ${error.message}`);
        return [];
    }
}

/**
 * Calculates Relative Strength Index (RSI).
 * @param {Array<number>} prices - Array of closing prices.
 * @param {number} period - The RSI period.
 * @returns {Array<number>} Array of RSI values.
 */
function calculateRSI(prices, period) {
    if (prices.length < period) {
        logger.warn(`Not enough data to calculate RSI (need ${period}, got ${prices.length}).`);
        return [];
    }
    try {
        const rsi = RSI.calculate({ period: period, values: prices });
        return rsi;
    } catch (error) {
        logger.error(`Error calculating RSI: ${error.message}`);
        return [];
    }
}

/**
 * Calculates Moving Average Convergence Divergence (MACD).
 * @param {Array<number>} prices - Array of closing prices.
 * @param {number} fastPeriod - The fast EMA period.
 * @param {number} slowPeriod - The slow EMA period.
 * @param {number} signalPeriod - The signal line EMA period.
 * @returns {Array<object>} Array of MACD values (MACD, Signal, Histogram).
 */
function calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod) {
    const minRequired = slowPeriod + signalPeriod - 1;
    if (prices.length < minRequired) {
        logger.warn(`Not enough data to calculate MACD (need at least ${minRequired}, got ${prices.length}).`);
        return [];
    }
    try {
        const macd = MACD.calculate({
            fastPeriod: fastPeriod,
            slowPeriod: slowPeriod,
            signalPeriod: signalPeriod,
            values: prices
        });
        return macd;
    } catch (error) {
        logger.error(`Error calculating MACD: ${error.message}`);
        return [];
    }
}

// Add more indicator calculations as needed (e.g., Bollinger Bands, SuperTrend)

export { calculateEMA, calculateRSI, calculateMACD };