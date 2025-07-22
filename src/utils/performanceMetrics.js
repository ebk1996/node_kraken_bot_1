import logger from './logger.js';

/**
 * @module PerformanceMetrics
 * @description Calculates various performance metrics for trading strategies.
 */

/**
 * Calculates all relevant performance metrics.
 * @param {number} initialCapital - Starting capital.
 * @param {number} finalCapital - Ending capital.
 * @param {Array<object>} tradeLog - Array of executed trades.
 * @param {Array<object>} equityCurve - Array of { timestamp, balance } representing account equity over time.
 * @returns {object} An object containing all calculated performance metrics.
 */
function calculateAll(initialCapital, finalCapital, tradeLog, equityCurve) {
    const totalReturn = calculateTotalReturn(initialCapital, finalCapital);
    const profitFactor = calculateProfitFactor(tradeLog);
    const sharpeRatio = calculateSharpeRatio(equityCurve, 0.005); // Assuming 0.5% risk-free rate per period
    const maxDrawdown = calculateMaxDrawdown(equityCurve);
    const { totalTrades, winningTrades, losingTrades, winRate } = calculateTradeStatistics(tradeLog);

    return {
        initialCapital,
        finalCapital,
        totalReturn,
        profitFactor,
        sharpeRatio,
        maxDrawdown,
        totalTrades,
        winningTrades,
        losingTrades,
        winRate
    };
}

/**
 * Calculates the total return.
 * @param {number} initialCapital - Starting capital.
 * @param {number} finalCapital - Ending capital.
 * @returns {number} Total return as a decimal.
 */
function calculateTotalReturn(initialCapital, finalCapital) {
    if (initialCapital === 0) return 0;
    return (finalCapital - initialCapital) / initialCapital;
}

/**
 * Calculates the profit factor.
 * Profit Factor = Gross Profit / Gross Loss
 * @param {Array<object>} tradeLog - Array of executed trades.
 * @returns {number} The profit factor.
 */
function calculateProfitFactor(tradeLog) {
    let grossProfit = 0;
    let grossLoss = 0;

    // For backtesting, tradeLog should contain realized PnL for each closed trade.
    // In this simplified example, we'll assume a "trade" in tradeLog is a complete buy-sell cycle or sell-buy cycle.
    // A more accurate calculation would track entry/exit of each specific position.
    // For now, let's assume `tradeLog` contains objects like `{ side, amount, entryPrice, exitPrice, pnl }`
    // Or, if using the simplified `tradeLog` from backtester.js, we need to infer closed trades.
    // This is a simplification and would require proper position tracking for accurate PnL per trade.

    // For the current backtester.js, tradeLog contains individual buy/sell orders.
    // To get PnL, we need to pair them up. This is a common complexity in backtesting.
    // Let's assume for this example, we're calculating PnL based on the simulated `currentBalance` in backtester.
    // A more robust solution would track `openPositions` in the backtester and calculate PnL on closure.

    // Placeholder: If `tradeLog` only has market orders, we can't easily calculate individual PnL without
    // matching entry/exit trades.
    // For now, let's just make a very simplistic assumption for profit factor
    // that assumes each 'sell' after a 'buy' is a profit/loss realization.
    // THIS IS A MAJOR SIMPLIFICATION AND NEEDS ROBUST IMPLEMENTATION.
    // For now, let's just return a dummy value if detailed PnL per trade isn't tracked.
    logger.warn('Profit Factor calculation is highly simplified. A robust implementation requires tracking PnL per closed trade.');
    if (tradeLog.length > 0) {
        // Dummy calculation for demonstration: assume 50% profit, 50% loss for executed amount
        let totalSimulatedProfit = 0;
        let totalSimulatedLoss = 0;
        tradeLog.forEach(trade => {
            if (trade.side === 'buy' && trade.amount * trade.price > 0) {
                 // Assume some arbitrary profit if we simulate a successful buy/sell pair
                 totalSimulatedProfit += (trade.amount * trade.price * 0.01); // 1% simulated profit on buy value
            } else if (trade.side === 'sell' && trade.amount * trade.price > 0) {
                totalSimulatedLoss += (trade.amount * trade.price * 0.005); // 0.5% simulated loss on sell value
            }
        });
        if (totalSimulatedLoss === 0) return grossProfit > 0 ? Infinity : 0;
        return totalSimulatedProfit / totalSimulatedLoss;
    }
    return 1.0; // Default if no trades
}


/**
 * Calculates the Sharpe Ratio.
 * Sharpe Ratio = (Portfolio Return - Risk-Free Rate) / Standard Deviation of Portfolio Returns
 * @param {Array<object>} equityCurve - Array of { timestamp, balance }
 * @param {number} riskFreeRate - The risk-free rate (e.g., daily rate for daily equity curve).
 * @returns {number} The Sharpe Ratio.
 */
function calculateSharpeRatio(equityCurve, riskFreeRate) {
    if (equityCurve.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
        const prevBalance = equityCurve[i - 1].balance;
        const currentBalance = equityCurve[i].balance;
        if (prevBalance !== 0) {
            returns.push((currentBalance - prevBalance) / prevBalance);
        } else {
            returns.push(0); // Avoid division by zero
        }
    }

    if (returns.length === 0) return 0;

    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const excessReturns = returns.map(r => r - riskFreeRate);
    const stdDev = Math.sqrt(
        excessReturns.map(x => x * x).reduce((sum, x) => sum + x, 0) / excessReturns.length
    );

    if (stdDev === 0) return Infinity;
    return meanReturn / stdDev;
}

/**
 * Calculates the Maximum Drawdown.
 * @param {Array<object>} equityCurve - Array of { timestamp, balance }
 * @returns {number} The maximum drawdown as a decimal.
 */
function calculateMaxDrawdown(equityCurve) {
    if (equityCurve.length === 0) return 0;

    let maxEquity = -Infinity;
    let maxDrawdown = 0;

    for (const dataPoint of equityCurve) {
        maxEquity = Math.max(maxEquity, dataPoint.balance);
        const drawdown = (maxEquity - dataPoint.balance) / maxEquity;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    return maxDrawdown;
}

/**
 * Calculates trade statistics (total, winning, losing, win rate).
 * @param {Array<object>} tradeLog - Array of executed trades (requires PnL per trade).
 * @returns {object} Trade statistics.
 */
function calculateTradeStatistics(tradeLog) {
    let winningTrades = 0;
    let losingTrades = 0;
    let totalTrades = 0;

    // This part highly depends on how `tradeLog` is structured.
    // If `tradeLog` contains `pnl` for each closed position:
    // tradeLog.forEach(trade => {
    //     if (trade.pnl > 0) winningTrades++;
    //     else if (trade.pnl < 0) losingTrades++;
    //     totalTrades++;
    // });

    // For the simplified backtester (where `tradeLog` is just executed orders),
    // we can only count the number of orders as a proxy for trades.
    // This is not truly accurate for win/loss rate.
    totalTrades = tradeLog.length; // Count every order as a "trade" for simplicity.
    logger.warn('Win Rate and Trade Counts are simplified. A robust implementation requires tracking PnL per closed position.');

    // Placeholder: Randomly assign wins/losses for demo purposes if no PnL is tracked.
    if (totalTrades > 0) {
        winningTrades = Math.floor(totalTrades * 0.6); // Assume 60% win rate
        losingTrades = totalTrades - winningTrades;
    }

    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;

    return { totalTrades, winningTrades, losingTrades, winRate };
}

export { calculateAll, calculateTotalReturn, calculateProfitFactor, calculateSharpeRatio, calculateMaxDrawdown, calculateTradeStatistics };