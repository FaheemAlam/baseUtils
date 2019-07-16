import * as cls from 'cls-hooked'
import * as errorReplacer from 'serialize-error'
import { Logging } from '../interfaces'

export enum logTypes {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export default class Logger implements Logging.Logger {
  static defaultDecorators: Logging.DefaultDecorators = {
    service: ''
  }
  decorators: Logging.LoggerDecorators = {
    service: '',
    component: ''
  }

  constructor (componentName: string, componentDecorators: Logging.InputDecorators = {}) {
    this.decorators = Object.assign({}, Logger.defaultDecorators, componentDecorators, {
      component: componentName,
      service: Logger.defaultDecorators.service
    })
  }

  static init (serviceName: string, decorators: Logging.InputDecorators = {}) {
    Logger.defaultDecorators = Object.assign({}, decorators, {
      service: serviceName
    })
  }

  log (level: logTypes, message: string, decorators: Logging.InputDecorators = {}) {
    let timestamp: string = (new Date()).toISOString()
    let log = Object.assign({}, this.decorators, decorators, {
      component: this.decorators.component,
      service: this.decorators.service
        || Logger.defaultDecorators.service
        || 'unknown service',
      level: level,
      message: message,
      timestamp
    })

    const requestData = cls.getNamespace('request')
    let requestId
    // istanbul ignore else
    if (requestData) {
      requestId = requestData.get('request_id')
    }

    if (requestId != null) {
      log.request_id = requestId
    }

    const output = process.env.NODE_ENV === 'production'
      ? JSON.stringify(log, errorReplacer(false))
      : JSON.stringify(log, errorReplacer(false), 2)

    switch (level) {
      case logTypes.DEBUG:
        console.log(output)
        break
      case logTypes.INFO:
        console.info(output)
        break
      case logTypes.WARNING:
        console.warn(output)
        break
      case logTypes.ERROR:
        console.error(output)
        break
      case logTypes.CRITICAL:
        console.error(output)
        break
    }
  }
  debug (message: string, decorators: Logging.InputDecorators = {}) {
    this.log(logTypes.DEBUG, message, decorators)
  }
  info (message: string, decorators: Logging.InputDecorators = {}) {
    this.log(logTypes.INFO, message, decorators)
  }
  warn<T extends Error> (error: T, decorators: Logging.InputDecorators = {}) {
    const message = `${error.name}: ${error.message}`
    decorators.error = error
    this.log(logTypes.WARNING, message, decorators)
  }
  error<T extends Error> (error: T, decorators: Logging.InputDecorators = {}) {
    const message = `${error.name}: ${error.message}`
    decorators.error = errorReplacer(error)
    this.log(logTypes.ERROR, message, decorators)
  }
  fatal<T extends Error> (error: T, decorators: Logging.InputDecorators = {}) {
    const message = `${error.name}: ${error.message}`
    decorators.critical = errorReplacer(error)
    this.log(logTypes.CRITICAL, message, decorators)
  }
  critical<T extends Error> (error: T, decorators: Logging.InputDecorators = {}) {
    const message = `${error.name}: ${error.message}`
    decorators.critical = errorReplacer(error)
    this.log(logTypes.CRITICAL, message, decorators)
  }
}
