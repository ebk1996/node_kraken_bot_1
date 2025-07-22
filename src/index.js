import CryptoBotApp from '../app.js';
import logger from './utils/logger.js';

/**
 * @fileoverview index.js
 * @description Main entry point for the crypto trading bot application.
 * Handles application startup and graceful shutdown.
 */

const bot = new CryptoBotApp();

async function startCryptoBotApp() {
    logger.info('Starting Crypto Trading Bot...');
    await bot.initialize();

    // Handle graceful exit
    process.on('SIGINT', () => {
        logger.info('SIGINT received. Initiating graceful shutdown...');
        bot.shutdown()
            .then(() => process.exit(0))
            .catch((err) => {
                logger.error(`Error during shutdown: ${err.stack || err}`);
                process.exit(1);
            });
    });

    process.on('SIGTERM', () => {
        logger.info('SIGTERM received. Initiating graceful shutdown...');
        bot.shutdown()
            .then(() => process.exit(0))
            .catch((err) => {
                logger.error(`Error during shutdown: ${err.stack || err}`);
                process.exit(1);
            });
    });

    process.on('unhandledRejection', async (reason, promise) => {
        logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason.stack || reason}`);
        // Gracefully shutdown on unhandled rejection
        await bot.shutdown();
        process.exit(1);
    });

    process.on('uncaughtException', (error) => {
        logger.error(`Uncaught Exception: ${error.stack || error}`);
        // Critical error, usually safer to exit
        bot.shutdown()
            .then(() => process.exit(1))
            .catch((err) => {
                logger.error(`Error during shutdown after uncaught exception: ${err.stack || err}`);
                process.exit(1);
            });
        // Note: Node.js will not wait for the promise to resolve before exiting.
        // For critical errors, it's recommended to exit immediately.
    });
}

startCryptoBotApp();