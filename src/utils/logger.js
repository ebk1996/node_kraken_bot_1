import winston from 'winston';
import path from 'path';

/**
 * @module Logger
 * @description Configures and exports a Winston logger for consistent logging across the application.
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
    level: LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log')
        })
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: path.join(__dirname, '../../logs/exceptions.log') })
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: path.join(__dirname, '../../logs/rejections.log') })
    ]
});

/**
 * Logs a message at the debug level.
 * @param {string} message - The message to log.
 * @param {...any} meta - Additional metadata to log.
 */
logger.debug = (message, ...meta) => logger.log('debug', message, ...meta);

/**
 * Logs a message at the info level.
 * @param {string} message - The message to log.
 * @param {...any} meta - Additional metadata to log.
 */
logger.info = (message, ...meta) => logger.log('info', message, ...meta);

/**
 * Logs a message at the warn level.
 * @param {string} message - The message to log.
 * @param {...any} meta - Additional metadata to log.
 */
logger.warn = (message, ...meta) => logger.log('warn', message, ...meta);

/**
 * Logs a message at the error level.
 * @param {string} message - The message to log.
 * @param {...any} meta - Additional metadata to log.
 */
logger.error = (message, ...meta) => logger.log('error', message, ...meta);

export default logger;