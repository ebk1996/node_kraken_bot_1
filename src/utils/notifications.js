const { Telegraf } = require('telegraf');
const config = require('../../config/default.json');
const logger = require('./logger');

/**
 * @module Notifications
 * @description Handles sending notifications to various platforms (e.g., Telegram, Discord).
 */

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const telegram = config.notifications.telegram.enabled && telegramBotToken && telegramChatId ? new Telegraf(telegramBotToken) : null;

if (telegram) {
    telegram.telegram.getMe().then(botInfo => {
        logger.info(`Telegram bot connected: @${botInfo.username}`);
    }).catch(err => {
        logger.error(`Failed to connect to Telegram bot: ${err.message}`);
        logger.warn('Telegram notifications are disabled due to connection error.');
        config.notifications.telegram.enabled = false; // Disable to prevent further errors
    });
} else {
    logger.warn('Telegram notifications are disabled. Check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env, or disable in config.json.');
}

/**
 * Sends a notification message.
 * @param {string} message - The message to send.
 * @param {string} [type='info'] - The type of notification (e.g., 'trade', 'error', 'summary').
 */
async function sendNotification(message, type = 'info') {
    if (config.notifications.telegram.enabled) {
        if (type === 'trade' && !config.notifications.telegram.tradeAlerts) {
            return; // Skip trade alerts if disabled
        }
        if (type === 'summary' && !config.notifications.telegram.summaryReports) {
            return; // Skip summary reports if disabled
        }
        try {
            await telegram.telegram.sendMessage(telegramChatId, message, { parse_mode: 'HTML' });
            logger.debug(`Telegram notification sent: ${message}`);
        } catch (error) {
            logger.error(`Error sending Telegram notification: ${error.message}`);
        }
    }
    // Add Discord or other notification logic here
    // if (config.notifications.discord.enabled) { ... }
}

module.exports = {
    sendNotification
};