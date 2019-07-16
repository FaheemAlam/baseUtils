/**
 * Base utils projects this will help in development process more easy and fast
 */
import * as express from 'express'
import logger from './utils/logger'
import * as db from './storage/database'
import { Lib } from './interfaces'
import { init as initRouter, finalize as finalizeRouting } from './routing'

export { default as database } from './storage/database'

// Export all logger methods and interfaces
export { default as logger } from './utils/logger'

// Export all router methods and interfaces
export { default as router } from './routing'
export { default as support } from './support'

// Export all interfaces
export * from './interfaces'

export const app: express.Application = express()
export let config: Lib.Config
/**
 * Initialize the micro service with the given configuration
 * The configuration is meant to be minimal, assuming most of the
 * values come from environment variables instead
 * @param {Config} configuration
 */
export async function init (configuration: Lib.Config, listOfErrors: Object = {}): Promise<express.Application> {
  config = configuration
  const serviceUri = config.name.replace(' ', '_').replace(/[^a-zA-Z0-9_]/gi, '').toLowerCase()
  logger.init(config.name)
  if (config.database) {
    await db.init(config.database_config, serviceUri)
  }
  // Setup router
  initRouter(app, config.service_root_uri, listOfErrors)

  return app
}

/**
 * This mehtod must be called by the service after routes
 * were configured for the app. This will attach additional
 * middleware to the app after routes are configured by the
 * service.
 */
export async function finalize (expressApp: express.Application) {
  finalizeRouting(expressApp)
}
