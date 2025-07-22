/**
 * @module AnomalyDetector
 * @description Detects anomalies in market data to identify potential opportunities or risks.
 */

const logger = require('../utils/logger');

class AnomalyDetector {
    constructor() {
        this.threshold = 2; // Standard deviations for anomaly detection
    }

    /**
     * Detects price anomalies in historical data.
     * @param {Array} priceData - Array of price values
     * @returns {Array} Array of anomaly indicators
     */
    detectPriceAnomalies(priceData) {
        if (!priceData || priceData.length < 10) {
            return [];
        }

        const mean = priceData.reduce((sum, price) => sum + price, 0) / priceData.length;
        const variance = priceData.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / priceData.length;
        const stdDev = Math.sqrt(variance);

        return priceData.map((price, index) => {
            const deviation = Math.abs(price - mean) / stdDev;
            return {
                index,
                price,
                isAnomaly: deviation > this.threshold,
                severity: deviation
            };
        });
    }

    /**
     * Detects volume anomalies.
     * @param {Array} volumeData - Array of volume values
     * @returns {Array} Array of volume anomaly indicators
     */
    detectVolumeAnomalies(volumeData) {
        if (!volumeData || volumeData.length < 10) {
            return [];
        }

        const mean = volumeData.reduce((sum, vol) => sum + vol, 0) / volumeData.length;
        const variance = volumeData.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / volumeData.length;
        const stdDev = Math.sqrt(variance);

        return volumeData.map((volume, index) => {
            const deviation = Math.abs(volume - mean) / stdDev;
            return {
                index,
                volume,
                isAnomaly: deviation > this.threshold,
                severity: deviation
            };
        });
    }
}

module.exports = AnomalyDetector;
  