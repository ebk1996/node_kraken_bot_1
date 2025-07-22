import StrategyInterface from './strategyInterface.js';
import IndicatorUtils from '../indicators/indicatorUtils.js';
import KrakenConnector from '../connectors/kraken.js'; // For initial historical data fetch
import logger from '../utils/logger.js';

/**
 * @class RsiEmaConfluence
 * @extends StrategyInterface
 * @description A trading strategy based on RSI overbought/oversold conditions and EMA crossovers.
 */
class RsiEmaConfluence extends StrategyInterface {
    constructor(symbol, config, tradingService) {
        super(symbol, config, tradingService);
        this.historicalData = []; // Store OHLCV candles
        this.maxHistoricalDataSize = Math.max(
            this.config.params.rsiPeriod,
            this.config.params.slowEmaPeriod
        ) * 2; // Buffer for indicators
        this.name = 'RSI_EMA_Confluence';
    }

    /**
     * Initializes the strategy by fetching initial historical data.
     * @returns {Promise<void>}
     */
    async initialize() {
        this.logger.info(`Initializing ${this.name} strategy for ${this.symbol}.`);
        try {
            // Fetch enough historical data for initial indicator calculations
            const ohlcv = await KrakenConnector.fetchOHLCV(this.symbol, this.tradingService.timeframe, this.maxHistoricalDataSize + 10);
            if (ohlcv && ohlcv.length > 0) {
                this.historicalData = ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
                    timestamp, open, high, low, close, volume
                }));
                this.logger.info(`Loaded ${this.historicalData.length} historical candles for ${this.symbol}.`);
            } else {
                this.logger.warn(`No historical data found for ${this.symbol} to initialize strategy.`);
            }
        } catch (error) {
            this.logger.error(`Error during strategy initialization for ${this.symbol}: ${error.message}`);
            throw error;
        }
    }

    /**
     * The main trading logic for the RSI + EMA Confluence strategy.
     * @param {object} newCandle - The latest OHLCV candle.
     * @returns {Promise<void>}
     */
    async run(newCandle) {
        this.historicalData.push(newCandle);
        if (this.historicalData.length > this.maxHistoricalDataSize) {
            this.historicalData.shift(); // Keep data size manageable
        }

        const closePrices = this.historicalData.map(c => c.close);

        if (closePrices.length < this.maxHistoricalDataSize) {
            this.logger.debug(`Not enough data for ${this.name} yet for ${this.symbol} (${closePrices.length}/${this.maxHistoricalDataSize}).`);
            return;
        }

        const rsi = IndicatorUtils.calculateRSI(closePrices, this.config.params.rsiPeriod);
        const fastEma = IndicatorUtils.calculateEMA(closePrices, this.config.params.fastEmaPeriod);
        const slowEma = IndicatorUtils.calculateEMA(closePrices, this.config.params.slowEmaPeriod);

        const currentRSI = rsi[rsi.length - 1];
        const prevRSI = rsi[rsi.length - 2];
        const currentFastEma = fastEma[fastEma.length - 1];
        const prevFastEma = fastEma[fastEma.length - 2];
        const currentSlowEma = slowEma[slowEma.length - 1];
        const prevSlowEma = slowEma[slowEma.length - 2];

        // Check for valid indicator values
        if (isNaN(currentRSI) || isNaN(currentFastEma) || isNaN(currentSlowEma)) {
            this.logger.debug(`Indicator calculation resulted in NaN for ${this.symbol}. Skipping trade decision.`);
            return;
        }

        this.logger.debug(`${this.symbol} - RSI: ${currentRSI.toFixed(2)}, Fast EMA: ${currentFastEma.toFixed(2)}, Slow EMA: ${currentSlowEma.toFixed(2)}`);

        // Entry Conditions (Long)
        const rsiOversoldCross = prevRSI <= this.config.params.rsiOversold && currentRSI > this.config.params.rsiOversold;
        const emaCrossUp = prevFastEma <= prevSlowEma && currentFastEma > currentSlowEma;

        if (!this.position && rsiOversoldCross && emaCrossUp) {
            this.logger.info(`LONG signal for ${this.symbol}! RSI(${currentRSI.toFixed(2)}) crossed oversold, EMA cross up.`);
            try {
                const order = await this.tradingService.executeTrade(
                    this.symbol,
                    'buy',
                    null, // Amount will be calculated by risk manager
                    'market',
                    { strategy: this.name, type: 'entry' }
                );
                if (order && order.id) {
                    this.setPosition('long', order.price, order.amount);
                    this.tradingService.managePosition(this.symbol, 'long', order.price, order.amount, this.config.risk);
                }
            } catch (error) {
                this.logger.error(`Failed to execute LONG trade for ${this.symbol}: ${error.message}`);
            }
        }

        // Entry Conditions (Short)
        const rsiOverboughtCross = prevRSI >= this.config.params.rsiOverbought && currentRSI < this.config.params.rsiOverbought;
        const emaCrossDown = prevFastEma >= prevSlowEma && currentFastEma < currentSlowEma;

        if (!this.position && rsiOverboughtCross && emaCrossDown) {
            this.logger.info(`SHORT signal for ${this.symbol}! RSI(${currentRSI.toFixed(2)}) crossed overbought, EMA cross down.`);
            try {
                const order = await this.tradingService.executeTrade(
                    this.symbol,
                    'sell',
                    null, // Amount will be calculated by risk manager
                    'market',
                    { strategy: this.name, type: 'entry' }
                );
                if (order && order.id) {
                    this.setPosition('short', order.price, order.amount);
                    this.tradingService.managePosition(this.symbol, 'short', order.price, order.amount, this.config.risk);
                }
            } catch (error) {
                this.logger.error(`Failed to execute SHORT trade for ${this.symbol}: ${error.message}`);
            }
        }
    }
}

export default RsiEmaConfluence;