/**
 * @fileoverview XRNotify Service Entrypoint
 * Unified entrypoint that starts the appropriate service based on SERVICE_NAME.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/entrypoint
 */

import { getConfig, getServiceName, isApiService, isListenerService, isWorkerService } from './core/config.js';
import {
  getLogger,
  setupGlobalErrorHandlers,
  logLifecycle,
  logError,
  createModuleLogger,
} from './core/logger.js';
import { initializePool, closePool, waitForConnection as waitForDb } from './core/db.js';
import { initializeRedis, closeRedis, waitForConnection as waitForRedis } from './core/redis.js';
import { createServer, startServer, setupGracefulShutdown, type FastifyInstance } from './server.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Service instance
 */
interface ServiceInstance {
  name: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

// =============================================================================
// Service Factories
// =============================================================================

const logger = createModuleLogger('entrypoint');

/**
 * Create API service
 */
async function createApiService(): Promise<ServiceInstance> {
  let server: FastifyInstance | null = null;

  return {
    name: 'api',
    start: async () => {
      server = await createServer();
      await startServer(server);

      // Setup graceful shutdown
      setupGracefulShutdown(server, async () => {
        await closePool();
        await closeRedis();
      });
    },
    stop: async () => {
      if (server) {
        await server.close();
      }
    },
  };
}

/**
 * Create Listener service
 *
 * Note: Full implementation will be in listener/index.ts
 */
async function createListenerService(): Promise<ServiceInstance> {
  // Placeholder - will be replaced with actual listener
  let running = false;
  let stopRequested = false;

  return {
    name: 'listener',
    start: async () => {
      running = true;
      logLifecycle(logger, 'started', { service: 'listener' });

      // Placeholder: Start XRPL listener
      // const listener = await createXrplListener();
      // await listener.start();

      logger.info('Listener service started (placeholder - implement XRPL connection)');

      // Keep the process running
      await new Promise<void>((resolve) => {
        const checkStop = setInterval(() => {
          if (stopRequested) {
            clearInterval(checkStop);
            resolve();
          }
        }, 100);
      });
    },
    stop: async () => {
      stopRequested = true;
      running = false;
      logLifecycle(logger, 'stopped', { service: 'listener' });
    },
  };
}

/**
 * Create Worker service
 *
 * Note: Full implementation will be in worker/index.ts
 */
async function createWorkerService(): Promise<ServiceInstance> {
  // Placeholder - will be replaced with actual worker
  let running = false;
  let stopRequested = false;

  return {
    name: 'worker',
    start: async () => {
      running = true;
      logLifecycle(logger, 'started', { service: 'worker' });

      // Placeholder: Start webhook delivery worker
      // const worker = await createDeliveryWorker();
      // await worker.start();

      logger.info('Worker service started (placeholder - implement delivery worker)');

      // Keep the process running
      await new Promise<void>((resolve) => {
        const checkStop = setInterval(() => {
          if (stopRequested) {
            clearInterval(checkStop);
            resolve();
          }
        }, 100);
      });
    },
    stop: async () => {
      stopRequested = true;
      running = false;
      logLifecycle(logger, 'stopped', { service: 'worker' });
    },
  };
}

// =============================================================================
// Main Entrypoint
// =============================================================================

/**
 * Initialize common dependencies
 */
async function initializeDependencies(): Promise<void> {
  const config = getConfig();

  logger.info(
    {
      service: config.serviceName,
      nodeEnv: config.nodeEnv,
      logLevel: config.log.level,
    },
    'Initializing dependencies'
  );

  // Initialize database pool
  initializePool();

  // Initialize Redis
  initializeRedis();

  // Wait for connections
  logger.info('Waiting for database connection...');
  await waitForDb();

  logger.info('Waiting for Redis connection...');
  await waitForRedis();

  logger.info('All dependencies initialized');
}

/**
 * Cleanup all resources
 */
async function cleanup(): Promise<void> {
  logger.info('Cleaning up resources...');

  try {
    await Promise.allSettled([
      closePool(),
      closeRedis(),
    ]);
    logger.info('Cleanup complete');
  } catch (error) {
    logError(logger, error, 'Error during cleanup');
  }
}

/**
 * Main entrypoint
 */
async function main(): Promise<void> {
  // Setup global error handlers
  setupGlobalErrorHandlers();

  const serviceName = getServiceName();
  logger.info({ serviceName }, 'Starting XRNotify service');

  try {
    // Initialize common dependencies
    await initializeDependencies();

    // Create and start the appropriate service
    let service: ServiceInstance;

    if (isApiService()) {
      service = await createApiService();
    } else if (isListenerService()) {
      service = await createListenerService();
    } else if (isWorkerService()) {
      service = await createWorkerService();
    } else {
      throw new Error(`Unknown service name: ${serviceName}`);
    }

    // Setup shutdown handlers for non-API services
    if (!isApiService()) {
      const shutdown = async (signal: string) => {
        logger.info({ signal }, 'Received shutdown signal');
        try {
          await service.stop();
          await cleanup();
          process.exit(0);
        } catch (error) {
          logError(logger, error, 'Error during shutdown');
          process.exit(1);
        }
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
    }

    // Start the service
    await service.start();
  } catch (error) {
    logError(logger, error, 'Fatal error during startup');
    await cleanup();
    process.exit(1);
  }
}

// =============================================================================
// Run
// =============================================================================

main().catch((error) => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});
