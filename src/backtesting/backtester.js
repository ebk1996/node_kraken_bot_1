import logger from '../utils/logger.js';
import { getStrategy } from '../strategies/strategiesRegistry.js'; // We'll create this later
import { calculateAll } from '../utils/performanceMetrics.js';
import fs from 'fs';
import path from 'path';
import { calculateLotSize } from '../riskManagement/riskManager.js';
import config from '../../config/default.json' with { type: 'json' };

/**
 * @module Backtester
 * @description Simulates trading strategies using historical OHLCV data.
 */

let backtestData = [];
let strategyInstance = null;
let initialCapital = 10000;
let currentBalance = initialCapital;
let tradeLog = []; // Stores simulated trades for performance analysis
let equityCurve = []; // Tracks balance over time

/**
 * Initializes the backtesting module with historical data and a strategy.
 * @param {string} symbol - The trading pair for backtesting.
 * @param {string} timeframe - The timeframe of the historical data.
 * @param {string} strategyName - The name of the strategy to backtest.
 * @param {object} strategyConfig - The configuration for the strategy.
 * @param {string} startDate - Start date for backtesting (ISO string).
 * @param {string} endDate - End date for backtesting (ISO string).
 */
async function initializeBacktester(symbol, timeframe, strategyName, strategyConfig, startDate, endDate) {
    logger.info(`Initializing backtester for ${symbol} with ${strategyName} strategy from ${startDate} to ${endDate}.`);

    // Simulate a tradingService for the strategy during backtesting
    const simulatedTradingService = {
        timeframe: timeframe,
        executeTrade: async function (s, side, amount, type, metadata, price) {
            // Simulate trade execution for backtesting
            let tradePrice;
            if (price) {
                tradePrice = price;
            } else if (typeof currentCandle !== 'undefined' && currentCandle && currentCandle.timestamp) {
                const idx = backtestData.findIndex(d => d.timestamp === currentCandle.timestamp);
                tradePrice = idx !== -1 ? backtestData[idx].close : null;
            } else {
                logger.error('Backtest: currentCandle is not set. Cannot determine trade price.');
                return null;
            if (tradePrice === null || tradePrice === undefined) {
                logger.error('Backtest: Unable to determine trade price. Skipping simulated trade.');
                return null;
            }
            }
            const calculatedAmount = amount || await calculateLotSize(s, tradePrice, currentBalance);

            if (calculatedAmount <= 0) {
                logger.warn(`Backtest: Calculated amount is zero or negative. Skipping simulated trade.`);
                return null;
            }

            let tradeCost = calculatedAmount * tradePrice;
            let status = 'closed';
            if (!simulatedTradingService.holdings) {
                simulatedTradingService.holdings = {};
            }
            if (!simulatedTradingService.holdings[s]) {
                simulatedTradingService.holdings[s] = 0;
            }

            if (side === 'buy') {
                if (currentBalance < tradeCost) {
                    logger.warn(`Backtest: Insufficient funds to buy ${calculatedAmount.toFixed(8)} ${s}.`);
                    return null;
                }
                currentBalance -= tradeCost;
                simulatedTradingService.holdings[s] += calculatedAmount;
            } else if (side === 'sell') {
                if (simulatedTradingService.holdings[s] < calculatedAmount) {
                    logger.warn(`Backtest: Insufficient holdings to sell ${calculatedAmount.toFixed(8)} ${s}.`);
                    return null;
                }
                currentBalance += tradeCost;
                simulatedTradingService.holdings[s] -= calculatedAmount;
            }

            // Track position for the symbol
            if (!simulatedTradingService.positions) simulatedTradingService.positions = {};
            if (!simulatedTradingService.positions[s]) simulatedTradingService.positions[s] = 0;

            if (side === 'sell') {
                if (simulatedTradingService.positions[s] < calculatedAmount) {
                    logger.warn(`Backtest: Insufficient ${s} position to sell ${calculatedAmount.toFixed(8)}. Skipping simulated trade.`);
                    return null;
                }
                currentBalance += tradeCost;
                simulatedTradingService.positions[s] -= calculatedAmount;
            } else if (side === 'buy') {
                simulatedTradingService.positions[s] += calculatedAmount;
            }

            const simulatedOrder = {
                id: `bt-${Date.now()}-${tradeLog.length}`,
                symbol: s,
                side,
                type,
                amount: calculatedAmount,
                price: tradePrice,
                status,
                datetime: new Date().toISOString(),
                fee: tradeCost * 0.001 // Simulate a fee
            };
            tradeLog.push(simulatedOrder);
            logger.debug(`Backtest simulated ${side} trade: ${calculatedAmount.toFixed(8)} ${s} @ ${tradePrice.toFixed(2)}. Balance: ${currentBalance.toFixed(2)}`);
            return simulatedOrder;
        },

        managePosition: async function (s, side, entryPrice, amount, strategyRiskConfig) {
            // Risk manager for backtest: we track SL/TP and apply on next candle
            const defaultStopLossPercent = parseFloat(process.env.DEFAULT_STOP_LOSS_PERCENT || config.riskManagement.defaultStopLossPercent);
            const defaultTakeProfitPercent = parseFloat(process.env.DEFAULT_TAKE_PROFIT_PERCENT || config.riskManagement.defaultTakeProfitPercent);

            const stopLossPercent = strategyRiskConfig.stopLossPercent || defaultStopLossPercent;
            const takeProfitPercent = strategyRiskConfig.takeProfitPercent || defaultTakeProfitPercent;

            let stopLossPrice;
            let takeProfitPrice;

            if (side === 'long') {
                stopLossPrice = entryPrice * (1 - stopLossPercent);
                takeProfitPrice = entryPrice * (1 + takeProfitPercent);
            } else { // short
                stopLossPrice = entryPrice * (1 + stopLossPercent);
                takeProfitPrice = entryPrice * (1 - takeProfitPercent);
            }
            // Store for internal tracking
            simulatedTradingService.currentPositions[s] = { side, entryPrice, amount, stopLossPrice, takeProfitPrice };
        },

        monitorAndExitPositions: async function (s, currentPrice) {
            const position = simulatedTradingService.currentPositions[s];
            if (!position) return;

            let action = null;
            if (position.side === 'long') {
                if (currentPrice <= position.stopLossPrice) {
                    action = 'stop_loss';
                } else if (currentPrice >= position.takeProfitPrice) {
                    action = 'take_profit';
                }
            } else { // short
                if (currentPrice >= position.stopLossPrice) {
                    action = 'stop_loss';
                } else if (currentPrice <= position.takeProfitPrice) {
                    action = 'take_profit';
                }
            }

            if (action) {
                logger.warn(`Backtest: ${action.toUpperCase()} triggered for ${s} ${position.side} position! Price: ${currentPrice.toFixed(2)}`);
                // Simulate exit trade
                const exitSide = position.side === 'long' ? 'sell' : 'buy';
                await simulatedTradingService.executeTrade(s, exitSide, position.amount, 'market', { strategy: 'RiskManager', type: action }, currentPrice);
                delete simulatedTradingService.currentPositions[s]; // Clear position
                strategyInstance.clearPosition(); // Clear strategy's position
            }
        },

        currentPositions: {} // Internal tracking for backtest
    };

    // Load historical data (assuming CSV or pre-parsed JSON)
    const dataFilePath = path.join(__dirname, `../../data/${symbol.replace('/', '_')}_${timeframe}.json`);
    try {
        const rawData = fs.readFileSync(dataFilePath, 'utf8');
        const parsedData = JSON.parse(rawData);
        // Filter data based on start and end dates
        backtestData = parsedData.filter(candle => {
            const candleTime = new Date(candle[0]); // assuming [timestamp, open, high, low, close, volume]
            return candleTime >= new Date(startDate) && candleTime <= new Date(endDate);
        }).map(([timestamp, open, high, low, close, volume]) => ({
            timestamp, open, high, low, close, volume
        }));

        logger.info(`Loaded ${backtestData.length} historical candles for backtesting.`);

        if (backtestData.length < 100) { // Arbitrary minimum for meaningful backtest
            logger.warn('Insufficient historical data for a meaningful backtest. Consider a wider date range or longer history.');
        }

    } catch (error) {
        logger.error(`Failed to load historical data from ${dataFilePath}: ${error.message}`);
        throw new Error('Historical data loading failed for backtesting.');
    }

    const StrategyClass = getStrategy(strategyName);
    if (!StrategyClass) {
        throw new Error(`Strategy '${strategyName}' not found.`);
    }
    strategyInstance = new StrategyClass(symbol, strategyConfig, simulatedTradingService);
    await strategyInstance.initialize();
}

/**
 * Runs the backtest simulation.
 * @returns {Promise<object>} Backtest results including performance metrics.
 */
async function runBacktest() {
    logger.info('Starting backtest simulation...');
    currentBalance = initialCapital;
    tradeLog = [];
    equityCurve = [{ timestamp: new Date(backtestData[0].timestamp).toISOString(), balance: initialCapital }];

    for (let i = 0; i < backtestData.length; i++) {
        let currentCandle = backtestData[i];
        const historicalSlice = backtestData.slice(0, i + 1); // Data up to and including current candle

        // const historicalSlice = backtestData.slice(0, i + 1); // Data up to and including current candle
        await strategyInstance.tradingService.monitorAndExitPositions(strategyInstance.symbol, currentCandle.close);

        await strategyInstance.run(currentCandle, historicalSlice);

        // Update equity curve
        equityCurve.push({
            timestamp: new Date(currentCandle.timestamp).toISOString(),
            balance: currentBalance // This needs to be more sophisticated with open positions
            // For simplicity, we are assuming balance update on trade execution.
            // A more complex backtester would calculate unrealized PnL from open positions.
        });
    }

    logger.info('Backtest simulation finished. Calculating performance metrics...');

    const finalBalance = currentBalance; // Or calculate based on final portfolio value + cash
    const performance = calculateAll(initialCapital, finalBalance, tradeLog, equityCurve);

    logger.info('Backtest Results:');
    logger.info(`  Initial Capital: $${initialCapital.toFixed(2)}`);
    logger.info(`  Final Capital: $${finalBalance.toFixed(2)}`);
    logger.info(`  Total Return: ${(performance.totalReturn * 100).toFixed(2)}%`);
    logger.info(`  Profit Factor: ${performance.profitFactor.toFixed(2)}`);
    logger.info(`  Sharpe Ratio: ${performance.sharpeRatio.toFixed(4)}`);
    logger.info(`  Max Drawdown: ${(performance.maxDrawdown * 100).toFixed(2)}%`);
    logger.info(`  Total Trades: ${performance.totalTrades}`);
    logger.info(`  Winning Trades: ${performance.winningTrades}`);
    logger.info(`  Losing Trades: ${performance.losingTrades}`);
    logger.info(`  Win Rate: ${(performance.winRate * 100).toFixed(2)}%`);

    return performance;
}

export { initializeBacktester, runBacktest };