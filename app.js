import logger from './src/utils/logger.js';
import config from './config/default.json' with { type: 'json' };
import strategyConfigs from './config/strategies.json' with { type: 'json' };
import MarketDataService from './src/services/marketDataService.js';
import TradingService from './src/services/tradingService.js';
import StrategyRegistry from './src/strategies/strategiesRegistry.js';
import Backtester from './src/backtesting/backtester.js';

/**
 * @module App
 * @description The main application orchestrator for the crypto trading bot.
 * Handles mode selection (live, paper, backtest) and initializes components.
 */

class CryptoBotApp {
    constructor() {
        this.mode = process.env.MODE || 'paper';
        this.marketDataService = null;
        this.strategies = {}; // Stores active strategy instances per symbol
        this.activeTradeSignals = {}; // Keep track of cool-down periods or active signals
    }

    /**
     * Initializes the bot based on the configured mode.
     * @returns {Promise<void>}
     */
    async initialize() {
        logger.info(`Starting bot in ${this.mode} mode.`);

        try {
            await TradingService.initializeTradingService(
                this.mode,
                process.env.KRAKEN_API_KEY,
                process.env.KRAKEN_API_SECRET
            );

            if (this.mode === 'backtest') {
                const backtestSymbol = process.env.BACKTEST_SYMBOL || config.exchange.symbols[0];
                const backtestTimeframe = process.env.BACKTEST_TIMEFRAME || config.exchange.timeframe;
                const backtestStartDate = process.env.BACKTEST_START_DATE;
                const backtestEndDate = process.env.BACKTEST_END_DATE;

                if (!backtestStartDate || !backtestEndDate) {
                    logger.error('BACKTEST_START_DATE and BACKTEST_END_DATE must be set in .env for backtesting.');
                    process.exit(1);
                }

                // Find an enabled strategy to backtest
                const enabledStrategyName = Object.keys(strategyConfigs).find(name => strategyConfigs[name].enabled);
                if (!enabledStrategyName) {
                    logger.error('No enabled strategy found in config/strategies.json for backtesting.');
                    process.exit(1);
                }
                const strategyConfig = strategyConfigs[enabledStrategyName];

                await Backtester.initializeBacktester(
                    backtestSymbol,
                    backtestTimeframe,
                    enabledStrategyName,
                    strategyConfig,
                    backtestStartDate,
                    backtestEndDate
                );
                const results = await Backtester.runBacktest();
                logger.info('Backtest completed. Results:', results);
                process.exit(0); // Exit after backtest
            } else { // Live or Paper Trading
                this.marketDataService = new MarketDataService();

                // Initialize and subscribe strategies to market data events
                for (const symbol of config.exchange.symbols) {
                    for (const strategyName in strategyConfigs) {
                        if (strategyConfigs[strategyName].enabled) {
                            const StrategyClass = StrategyRegistry.getStrategy(strategyName);
                            if (StrategyClass) {
                                const strategyInstance = new StrategyClass(symbol, strategyConfigs[strategyName], TradingService);
                                await strategyInstance.initialize(); // Initialize strategy (e.g., fetch historical data)
                                this.strategies[`${symbol}-${strategyName}`] = strategyInstance;
                                logger.info(`Strategy '${strategyName}' initialized for ${symbol}.`);

                                // Subscribe the strategy to market data updates
                                this.marketDataService.on('ohlcv', async (dataSymbol, candle) => {
                                    if (dataSymbol === symbol) {
                                        logger.debug(`Processing new candle for ${dataSymbol} with ${strategyName}: ${new Date(candle.timestamp).toISOString()}`);
                                        await strategyInstance.run(candle);
                                        // Also monitor positions for SL/TP
                                        await TradingService.monitorAndExitPositions(symbol, candle.close);
                                    }
                                });
                            } else {
                                logger.warn(`Strategy '${strategyName}' not found in registry. Skipping.`);
                            }
                        }
                    }
                }

                this.marketDataService.startPolling(); // Start polling for live/paper trading

                // Optional: Task scheduler for daily reports
                if (config.notifications.telegram.enabled && config.notifications.telegram.summaryReports) {
                    const cron = require('node-cron');
                    cron.schedule('0 0 * * *', async () => { // Every day at midnight
                        logger.info('Generating daily performance summary...');
                        const currentBalances = await TradingService.getBalances();
                        const initialCapital = TradingService.initialCapital || 10000; // Need to track this from TradingService
                        const currentEquity = currentBalances[config.exchange.symbols[0].split('/')[1]]; // USD balance
                        const totalReturn = PerformanceMetrics.calculateTotalReturn(initialCapital, currentEquity);
                        const summary = `📈 Daily Report 📈\n` +
                                        `Date: ${new Date().toLocaleDateString()}\n` +
                                        `Current Balance (USD): $${currentEquity.toFixed(2)}\n` +
                                        `Total Return: ${(totalReturn * 100).toFixed(2)}%\n` +
                                        `Open Positions: ${Object.keys(require('./riskManagement/riskManager').getOpenPositions()).length}`;
                        notifications.sendNotification(summary, 'summary');
                    });
                }
            }
        } catch (error) {
            logger.error(`Bot initialization failed: ${error.message}`);
            process.exit(1);
        }
    }

    /**
     * Gracefully shuts down the bot.
     */
    async shutdown() {
        logger.info('Shutting down bot...');
        if (this.marketDataService) {
            this.marketDataService.stopPolling();
            // This assumes marketDataService has a stop method
        }
        // TODO: Implement logic to cancel open orders, close positions if desired, save state.
        logger.info('Bot shut down successfully.');
        process.exit(0);
    }
}

export default CryptoBotApp;