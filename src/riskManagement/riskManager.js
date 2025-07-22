import logger from '../utils/logger.js';
import config from '../../config/default.json' with { type: 'json' };

/**
 * @module RiskManager
 * @description Handles risk management calculations and validations for trading operations.
 */

/**
 * Calculates the appropriate lot size based on risk management rules.
 * @param {string} symbol - The trading pair.
 * @param {number} currentPrice - Current market price.
 * @param {number} accountBalance - Available account balance.
 * @param {number} riskPercentage - Risk percentage per trade (default from config).
 * @returns {Promise<number>} Calculated lot size.
 */
async function calculateLotSize(symbol, currentPrice, accountBalance, riskPercentage = null) {
    const riskPercent = riskPercentage || config.risk.maxRiskPerTrade;
    const maxRiskAmount = accountBalance * riskPercent;
    
    // Calculate position size based on risk amount
    const positionSize = maxRiskAmount / currentPrice;
    
    // Apply minimum balance check
    if (accountBalance < config.risk.minimumBalance) {
        logger.warn(`Account balance ${accountBalance} below minimum ${config.risk.minimumBalance}`);
        return 0;
    }
    
    // Ensure we don't risk more than max per trade
    const maxTradeValue = accountBalance * config.risk.maxRiskPerTrade;
    const calculatedSize = Math.min(positionSize, maxTradeValue / currentPrice);
    
    logger.debug(`Calculated lot size for ${symbol}: ${calculatedSize}`, {
        symbol,
        currentPrice,
        accountBalance,
        riskPercent,
        calculatedSize
    });
    
    return Math.max(0, calculatedSize);
}

/**
 * Validates if a trade meets risk management criteria.
 * @param {string} symbol - The trading pair.
 * @param {number} amount - Trade amount.
 * @param {number} price - Trade price.
 * @param {number} accountBalance - Current account balance.
 * @returns {Promise<boolean>} True if trade is valid, false otherwise.
 */
async function validateTrade(symbol, amount, price, accountBalance) {
    const tradeValue = amount * price;
    const riskPercentage = tradeValue / accountBalance;
    
    // Check maximum risk per trade
    if (riskPercentage > config.risk.maxRiskPerTrade) {
        logger.warn(`Trade exceeds max risk per trade: ${riskPercentage.toFixed(4)} > ${config.risk.maxRiskPerTrade}`);
        return false;
    }
    
    // Check minimum balance requirement
    if (accountBalance < config.risk.minimumBalance) {
        logger.warn(`Account balance below minimum: ${accountBalance} < ${config.risk.minimumBalance}`);
        return false;
    }
    
    // Check if trade amount is reasonable (not too small)
    const minTradeValue = 10; // Minimum $10 trade
    if (tradeValue < minTradeValue) {
        logger.warn(`Trade value too small: ${tradeValue} < ${minTradeValue}`);
        return false;
    }
    
    return true;
}

/**
 * Calculates stop loss price based on configuration.
 * @param {number} entryPrice - Entry price of the position.
 * @param {'buy'|'sell'} side - Position side.
 * @param {number} stopLossPercentage - Stop loss percentage (default from config).
 * @returns {number} Stop loss price.
 */
function calculateStopLoss(entryPrice, side, stopLossPercentage = null) {
    const stopLossPercent = stopLossPercentage || config.risk.stopLossPercentage;
    
    if (side === 'buy') {
        // For long positions, stop loss is below entry price
        return entryPrice * (1 - stopLossPercent);
    } else {
        // For short positions, stop loss is above entry price
        return entryPrice * (1 + stopLossPercent);
    }
}

/**
 * Calculates take profit price based on configuration.
 * @param {number} entryPrice - Entry price of the position.
 * @param {'buy'|'sell'} side - Position side.
 * @param {number} takeProfitPercentage - Take profit percentage (default from config).
 * @returns {number} Take profit price.
 */
function calculateTakeProfit(entryPrice, side, takeProfitPercentage = null) {
    const takeProfitPercent = takeProfitPercentage || config.risk.takeProfitPercentage;
    
    if (side === 'buy') {
        // For long positions, take profit is above entry price
        return entryPrice * (1 + takeProfitPercent);
    } else {
        // For short positions, take profit is below entry price
        return entryPrice * (1 - takeProfitPercent);
    }
}

/**
 * Checks if the total portfolio risk is within acceptable limits.
 * @param {object[]} openPositions - Array of open positions.
 * @param {number} accountBalance - Current account balance.
 * @returns {boolean} True if total risk is acceptable.
 */
function checkTotalRisk(openPositions, accountBalance) {
    const totalExposure = openPositions.reduce((total, position) => {
        return total + (position.amount * position.price);
    }, 0);
    
    const totalRiskPercentage = totalExposure / accountBalance;
    
    if (totalRiskPercentage > config.risk.maxTotalRisk) {
        logger.warn(`Total portfolio risk exceeds maximum: ${totalRiskPercentage.toFixed(4)} > ${config.risk.maxTotalRisk}`);
        return false;
    }
    
    return true;
}

/**
 * Calculates the maximum number of concurrent trades allowed.
 * @param {number} accountBalance - Current account balance.
 * @returns {number} Maximum concurrent trades.
 */
function getMaxConcurrentTrades(accountBalance) {
    // Base max concurrent trades from config
    let maxTrades = config.trading.maxConcurrentTrades;
    
    // Reduce max trades if account balance is low
    if (accountBalance < 1000) {
        maxTrades = Math.min(maxTrades, 1);
    } else if (accountBalance < 5000) {
        maxTrades = Math.min(maxTrades, 2);
    }
    
    return maxTrades;
}

/**
 * Calculates position size based on volatility.
 * @param {number[]} priceHistory - Historical price data.
 * @param {number} basePositionSize - Base position size.
 * @returns {number} Adjusted position size.
 */
function adjustPositionForVolatility(priceHistory, basePositionSize) {
    if (priceHistory.length < 2) {
        return basePositionSize;
    }
    
    // Calculate volatility (standard deviation of returns)
    const returns = [];
    for (let i = 1; i < priceHistory.length; i++) {
        const dailyReturn = (priceHistory[i] - priceHistory[i-1]) / priceHistory[i-1];
        returns.push(dailyReturn);
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // Reduce position size for high volatility
    const volatilityAdjustment = Math.max(0.5, 1 - (volatility * 10)); // Adjust multiplier as needed
    
    return basePositionSize * volatilityAdjustment;
}

/**
 * Validates if enough time has passed since last trade (cooldown).
 * @param {number} lastTradeTime - Timestamp of last trade.
 * @param {number} cooldownPeriod - Cooldown period in milliseconds.
 * @returns {boolean} True if cooldown period has passed.
 */
function validateCooldown(lastTradeTime, cooldownPeriod = null) {
    const cooldown = cooldownPeriod || config.trading.cooldownPeriod;
    const timeSinceLastTrade = Date.now() - lastTradeTime;
    
    return timeSinceLastTrade >= cooldown;
}

export { calculateLotSize, validateTrade, calculateStopLoss, calculateTakeProfit, checkTotalRisk, getMaxConcurrentTrades, adjustPositionForVolatility, validateCooldown };
  