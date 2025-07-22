// src/server.js (optional, can be integrated into app.js)
const express = require('express');
const app = express();
const port = 3000;
const TradingService = require('./services/tradingService');
const RiskManager = require('./riskManagement/riskManager');
const path = require('path');
const config = require(path.resolve(__dirname, '../config/default.json'));
const logger = require('./utils/logger');

app.get('/status', (req, res) => {
    res.json({
        mode: process.env.MODE || 'production',
        dryRun: config.trading.dryRun,
        balances: TradingService.getBalances(),
        openPositions: RiskManager.getOpenPositions()
        // TODO: Add more status info fields if needed
    });
});

app.listen(port, () => {
    logger.info(`Server listening on http://localhost:${port}`);
});


