import KrakenConnector from '../connectors/kraken.js';
console.log('Trading Services Initialized')
import RiskManager from '../riskManagement/riskManager.js';
import PaperTrader from '../paperTrading/paperTrader.js';
import logger from '../utils/logger.js';
import notifications from '../utils/notifications.js';
import config from '../../config/default.json' with { type: 'json' };

/**
 * @module TradingService
 * @description Centralized service for executing trades and interacting with the exchange/paper trader.
 */

let tradeExecutionMode = process.env.MODE || 'paper'; // live, paper, backtest
let isDryRun = config.trading.dryRun;
let currentBalance = {}; // Cache balances

/**
 * Initializes the trading service based on the operating mode.
 * @param {string} mode - 'live', 'paper', or 'backtest'.
 * @param {string} apiKey - API key for live mode.
 * @param {string} apiSecret - API secret for live mode.
 */
async function initializeTradingService(mode, apiKey, apiSecret) {
    tradeExecutionMode = mode;
    logger.info(`Trading service operating in ${tradeExecutionMode} mode.`);

    if (tradeExecutionMode === 'live') {
        if (!apiKey || !apiSecret) {
            logger.error('API key and secret are required for live trading mode.');
            throw new Error('Missing API credentials for live mode.');
        }
        KrakenConnector.initializeKraken(apiKey, apiSecret, false);
        // Fetch initial balances
        for (const symbol of config.exchange.symbols) {
            const quoteAsset = symbol.split('/')[1];
            currentBalance[quoteAsset] = await KrakenConnector.getBalance(quoteAsset);
            const baseAsset = symbol.split('/')[0];
            currentBalance[baseAsset] = await KrakenConnector.getBalance(baseAsset);
        }
        logger.info(`Initial balances: ${JSON.stringify(currentBalance)}`);
    } else if (tradeExecutionMode === 'paper') {
        PaperTrader.initializePaperTrader();
        currentBalance = PaperTrader.getBalances();
        logger.info(`Paper trading initial balances: ${JSON.stringify(currentBalance)}`);
    } else if (tradeExecutionMode === 'backtest') {
        // Backtester handles its own balance simulation
        logger.info('Trading service is in backtest mode. Trades will be simulated by the backtester.');
    } else {
        logger.error(`Invalid trade execution mode: ${mode}`);
        throw new Error('Invalid trade execution mode.');
    }

    if (isDryRun && tradeExecutionMode === 'live') {
        logger.warn('*** DRY RUN MODE IS ACTIVE! NO REAL TRADES WILL BE EXECUTED! ***');
    }
}

/**
 * Executes a trade (buy/sell).
 * @param {string} symbol - The trading pair (e.g., 'BTC/USD').
 * @param {'buy'|'sell'} side - Order side.
 * @param {number|null} amount - Amount to trade in base currency. If null, lot size will be calculated.
 * @param {'market'|'limit'} type - Order type.
 * @param {object} metadata - Additional trade metadata (e.g., strategy name, entry/exit).
 * @param {number} [price] - Price for limit orders.
 * @returns {Promise<object|null>} Order details if successful, null otherwise.
 */
async function executeTrade(symbol, side, amount, type, metadata, price = null) {
    if (tradeExecutionMode === 'backtest') {
        logger.debug(`Backtest mode: Simulating trade for ${symbol} ${side} ${amount || 'calculated'} ${type}`);
        return {
            id: 'backtest-order-' + Date.now(),
            symbol, side, type, amount, price: price || 0, status: 'closed',
            datetime: new Date().toISOString()
        }; // Simulate success for backtesting
    }

    const quoteAsset = symbol.split('/')[1];
    const baseAsset = symbol.split('/')[0];

    let actualAmount = amount;

    if (actualAmount === null) { // Calculate lot size if not provided
        const balanceForLotSizing = tradeExecutionMode === 'live' ? currentBalance[quoteAsset] : PaperTrader.getBalances()[quoteAsset];
        const currentPrice = await KrakenConnector.getTicker(symbol).then(t => t.last);
        actualAmount = await RiskManager.calculateLotSize(symbol, currentPrice, balanceForLotSizing);
        if (actualAmount <= 0) {
            logger.warn(`Calculated amount for ${symbol} is zero or negative. Skipping trade.`);
            notifications.sendNotification(`🚫 Trade failed: Calculated amount zero for ${symbol}.`, 'error');
            return null;
        }
        logger.info(`Calculated trade amount for ${symbol}: ${actualAmount.toFixed(8)}`);
    }

    if (isDryRun && tradeExecutionMode === 'live') {
        logger.warn(`DRY RUN: Would have executed ${side} ${actualAmount.toFixed(8)} ${baseAsset} for ${symbol} at ${type} price ${price ? price.toFixed(2) : 'market'}`);
        notifications.sendNotification(`DRY RUN: ${side.toUpperCase()} ${actualAmount.toFixed(8)} ${baseAsset} on ${symbol} (Type: ${type}, Price: ${price ? price.toFixed(2) : 'market'})`, 'info');
        return { id: 'dry-run-' + Date.now(), symbol, side, type, amount: actualAmount, price: price || (await KrakenConnector.getTicker(symbol)).last, status: 'closed' };
    }

    try {
        let order;
        if (tradeExecutionMode === 'live') {
            if (type === 'market') {
                order = await KrakenConnector.createMarketOrder(symbol, side, actualAmount);
            } else if (type === 'limit') {
                if (!price) {
                    throw new Error('Price is required for limit orders.');
                }
                order = await KrakenConnector.createLimitOrder(symbol, side, actualAmount, price);
            }
        } else if (tradeExecutionMode === 'paper') {
            order = await PaperTrader.executeTrade(symbol, side, actualAmount, type, price);
        }

        if (order && order.id) {
            logger.info(`Trade executed successfully: ${side.toUpperCase()} ${order.amount.toFixed(8)} ${baseAsset} on ${order.symbol} at ${order.price.toFixed(2)}. Order ID: ${order.id}`);
            notifications.sendNotification(`✅ Trade Executed: ${side.toUpperCase()} ${order.amount.toFixed(8)} ${baseAsset} on ${order.symbol} @ ${order.price.toFixed(2)} (Strategy: ${metadata.strategy || 'N/A'}, Type: ${metadata.type || 'N/A'})`, 'trade');

            // Update local balance cache for live mode
            if (tradeExecutionMode === 'live' && order.status === 'closed') {
                currentBalance[quoteAsset] -= order.amount * order.price;
                currentBalance[baseAsset] += order.amount;
            }

            return order;
        } else {
            logger.warn(`Trade execution for ${symbol} did not return a valid order object.`);
            notifications.sendNotification(`⚠️ Trade warning: No valid order object returned for ${symbol} ${side}.`, 'warn');
            return null;
        }
    } catch (error) {
        logger.error(`Failed to execute trade for ${symbol} (${side} ${actualAmount}): ${error.message}`);
        notifications.sendNotification(`❌ Trade failed: ${symbol} ${side} ${actualAmount} - ${error.message}`, 'error');
        return null;
    }
}

/**
 * Manages the position, including setting stop-loss and take-profit targets.
 * @param {string} symbol - The trading pair.
 * @param {'long'|'short'} side - The side of the position.
 * @param {number} entryPrice - The entry price of the position.
 * @param {number} amount - The amount of base currency.
 * @param {object} strategyRiskConfig - Strategy-specific risk parameters.
 */
async function managePosition(symbol, side, entryPrice, amount, strategyRiskConfig) {
    if (tradeExecutionMode === 'backtest') {
        // Backtester manages its own positions
        return;
    }
    await RiskManager.managePosition(symbol, side, entryPrice, amount, strategyRiskConfig);
}

/**
 * Monitors existing positions for stop-loss or take-profit triggers.
 * This should be called regularly with the latest price.
 * @param {string} symbol - The trading pair.
 * @param {number} currentPrice - The current market price.
 * @returns {Promise<void>}
 */
async function monitorAndExitPositions(symbol, currentPrice) {
    if (tradeExecutionMode === 'backtest') {
        return; // Backtester handles this
    }

    const triggeredAction = await RiskManager.monitorPositions(symbol, currentPrice);
    if (triggeredAction) {
        const { action, symbol, side, amount } = triggeredAction;
        logger.info(`${action.toUpperCase()} triggered for ${symbol} ${side} position! Executing exit trade.`);
        await executeTrade(
            symbol,
            side === 'long' ? 'sell' : 'buy', // Opposite side to close
            amount,
            'market',
            { strategy: 'RiskManager', type: action }
        );
        notifications.sendNotification(`🚨 ${action.toUpperCase()} triggered for ${symbol} ${side} position. Exited.`, 'trade');
    }
}

/**
 * Retrieves the current balance for the bot.
 * @returns {object} Current balances in all tracked currencies.
 */
function getBalances() {
    if (tradeExecutionMode === 'live') {
        return currentBalance;
    } else if (tradeExecutionMode === 'paper') {
        return PaperTrader.getBalances();
    }
    return {}; // For backtest, balance is managed internally by backtester
}


export { initializeTradingService, executeTrade, managePosition, monitorAndExitPositions, getBalances };