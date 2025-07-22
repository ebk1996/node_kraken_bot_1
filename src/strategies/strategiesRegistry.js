/**
 * @module StrategyRegistry
 * @description A registry for managing and retrieving trading strategies.
 * New strategies should be added here.
 */

import RsiEmaConfluence from './rsiEmaConfluence.js';
// const MacdCross = require('./macdCross'); // Uncomment and import new strategies

const strategies = {
    'RSI_EMA_Confluence': RsiEmaConfluence,
    // 'MACD_Cross': MacdCross,
};

/**
 * Retrieves a strategy class by its name.
 * @param {string} name - The name of the strategy.
 * @returns {class|null} The strategy class or null if not found.
 */
function getStrategy(name) {
    return strategies[name];
}

/**
 * Lists all registered strategy names.
 * @returns {Array<string>} An array of strategy names.
 */
function listStrategies() {
    return Object.keys(strategies);
}

export { getStrategy, listStrategies };