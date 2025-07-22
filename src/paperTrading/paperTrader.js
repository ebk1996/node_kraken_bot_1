const logger = require('../utils/logger');
const notifications = require('../utils/notifications');

/**
 * @module PaperTrader
 * @description Simulates exchange interactions for paper trading.
 * Tracks balance, open positions, and order execution without real funds.
 */

let initialBalance = {
    'USD': 10000, // Initial virtual USD balance
    'BTC': 0,
    'ETH': 0
};
let currentBalances = { ...initialBalance };
let openOrders = {}; // { orderId: { symbol, side, amount, price, type, status } }
let trades = []; // Stores executed trades for performance analysis

/**
 * Initializes the paper trading module.
 */
function initializePaperTrader() {
    currentBalances = { ...initialBalance };
    openOrders = {};
    trades = [];
    logger.info('Paper trading module initialized. Starting with virtual balance:', initialBalance);
    notifications.sendNotification(`🚀 Paper Trading Started! Initial Balance: $${initialBalance.USD.toFixed(2)}`, 'info');
}

/**
 * Simulates executing a trade (buy/sell).
 * @param {string} symbol - The trading pair (e.g., 'BTC/USD').
 * @param {'buy'|'sell'} side - Order side.
 * @param {number} amount - Amount to trade in base currency.
 * @param {'market'|'limit'} type - Order type.
 * @param {number} [price] - Price for limit orders (current market price if not provided for market orders).
 * @returns {object} Simulated order details.
 */
async function executeTrade(symbol, side, amount, type, price = null) {
    const baseAsset = symbol.split('/')[0];
    const quoteAsset = symbol.split('/')[1];
    const timestamp = Date.now();
    const orderId = `paper-${side}-${timestamp}`;

    let executionPrice = price;

    if (type === 'market') {
        // For market orders, simulate execution at current market price (fetch from KrakenConnector)
        const ticker = await require('../connectors/kraken').getTicker(symbol);
        executionPrice = ticker.last;
    } else if (type === 'limit' && !executionPrice) {
        logger.error('Limit order requires a price.');
        throw new Error('Limit order requires a price.');
    }

    const tradeCost = amount * executionPrice;

    if (side === 'buy') {
        if (currentBalances[quoteAsset] < tradeCost) {
            logger.warn(`Paper trade failed: Insufficient ${quoteAsset} balance to buy ${amount} ${baseAsset} at ${executionPrice}.`);
            notifications.sendNotification(`❌ Paper trade failed: Insufficient ${quoteAsset} balance for ${symbol} BUY.`, 'trade');
            return null;
        }
        currentBalances[quoteAsset] -= tradeCost;
        currentBalances[baseAsset] += amount;
    } else { // sell
        if (currentBalances[baseAsset] < amount) {
            logger.warn(`Paper trade failed: Insufficient ${baseAsset} balance to sell ${amount} ${baseAsset} at ${executionPrice}.`);
            notifications.sendNotification(`❌ Paper trade failed: Insufficient ${baseAsset} balance for ${symbol} SELL.`, 'trade');
            return null;
        }
        currentBalances[quoteAsset] += tradeCost;
        currentBalances[baseAsset] -= amount;
    }

    const order = {
        id: orderId,
        symbol,
        side,
        type,
        amount,
        price: executionPrice,
        status: 'closed', // For simplicity, market orders close immediately in paper trade
        datetime: new Date(timestamp).toISOString(),
        fee: tradeCost * 0.001 // Simulate a small fee
    };

    trades.push(order);
    logger.info(`Paper trade executed: ${side.toUpperCase()} ${amount.toFixed(8)} ${baseAsset} on ${symbol} @ ${executionPrice.toFixed(2)}. Current USD Balance: ${currentBalances.USD.toFixed(2)}`);
    return order;
}

/**
 * Retrieves the current simulated balances.
 * @returns {object} An object containing current balances for all tracked assets.
 */
function getBalances() {
    return { ...currentBalances };
}

/**
 * Retrieves all simulated executed trades.
 * @returns {Array<object>} An array of executed trade objects.
 */
function getTrades() {
    return trades;
}

/**
 * Calculates the total unrealized profit/loss for the current virtual portfolio.
 * @param {object} latestPrices - Object containing latest prices for all symbols (e.g., { 'BTC/USD': 40000 }).
 * @returns {number} The total unrealized P/L.
 */
function calculateUnrealizedPNL(latestPrices) {
    let pnl = 0;
    for (const asset in currentBalances) {
        if (asset !== 'USD') { // Assuming USD is the quote currency
            const symbol = `${asset}/USD`; // Construct symbol
            if (latestPrices[symbol] && currentBalances[asset] > 0) {
                pnl += (currentBalances[asset] * latestPrices[symbol]) - (initialBalance[asset] * latestPrices[symbol] || 0);
            }
        }
    }
    return pnl;
}

module.exports = {
    initializePaperTrader,
    executeTrade,
    getBalances,
    getTrades,
    calculateUnrealizedPNL
};