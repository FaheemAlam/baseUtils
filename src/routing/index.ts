/**
 * router file
 */
// tslint:disable: object-literal-sort-keys
import * as bodyParser from 'body-parser'
import * as express from 'express'
import { Logging, Router } from '../interfaces'
import { ErrorList } from './interfaces'

import * as _ from 'lodash'
import * as uuid from 'uuid'

import Logger from '../utils/logger'

import * as cls from 'cls-hooked'

const logger = new Logger('Utils:Routing')

let app: express.Application
let namespace: string = ''
const errorList: ErrorList = {
  'NotFound': {
    'message': 'The resource you are looking for does not exist',
    'statusCode': 404
  },
  'UnexpectedError': {
    'message': 'There was an unexpected error. We have been alerted and are looking into it.',
    'statusCode': 500
  },
  'InvalidRequest': {
    'message': 'Invalid request',
    'statusCode': 400
  },
  'InvalidRequest.charset.unsupported': {
    'message': 'Unsupported charset',
    'statusCode': 415
  },
  'InvalidRequest.encoding.unsupported': {
    'message': 'Content encoding unsupported',
    'statusCode': 415
  },
  'InvalidRequest.entity.parse.failed': {
    'statusCode': 400,
    'message': 'Invalid request'
  },
  'InvalidRequest.entity.too.large': {
    'statusCode': 413,
    'message': 'Request entity too large'
  },
  'InvalidRequest.request.aborted': {
    'statusCode': 400,
    'message': 'Request aborted'
  },
  'InvalidRequest.request.size.invalid': {
    'statusCode': 400,
    'message': 'Request size did not match content length'
  },
  'InvalidRequest.stream.encoding.set': {
    'statusCode': 500,
    'message': 'There was an unexpected error. We have been alerted and are looking into it.'
  },
  'InvalidRequest.parameters.too.many': {
    'statusCode': 413,
    'message': 'Too many parameters'
  },
  'Unauthorised': {
    'message': 'You are not authorised to access this resource',
    'statusCode': 401
  }
}
/**
 * Register error list for the service
 */
export function registerErrorList (listOfErrors: Object): void {
  _.merge(errorList, listOfErrors)
  _(errorList).forEach((code: Object, key: string) => {
    errorList[key].err_code = _.toUpper(_.snakeCase(key))
  })

}

/**
 * Initialization method only exposed internally
 */
export function init (
  expressApp: express.Application,
  namespaceUri: string = '',
  listOfErrors: Object = {}
): void {
  app = expressApp
  namespace = namespaceUri
  registerErrorList(listOfErrors)
}

/**
 * Attach additional middleware
 */
export const finalize = (expressApp: express.Application) => {
  // add error handler
  app.use(errorHandler)
  // if none of the routes were hit, then the route
  // does not exist. User not found handler for such
  // case.
  app.use(notFoundErrorHandler)
}

/**
 * Helper for extend response variants
 */
function customResponse (res: express.Response) {

  let self: any = {}

  self._isCustomResponse = true

  return {
    json: (jsonContent) => {
      // we're returning JSON here. If this is not
      // object or array then make and object out of it.
      if (!_.isPlainObject(jsonContent) && !_.isArray(jsonContent)) {
        jsonContent = {
          message: jsonContent
        }
      }
      self._responseJson = jsonContent

      return self
    },
    html: (htmlContent) => {
      self._responseHtml = htmlContent

      return self
    },
    redirect: (url) => {
      self._responseRedirect = url

      return self
    },
    status: (code: number) => {
      res.status(code)
      return self
    }
  }
}

/**
 * Function make processing response from route handler
 */
function responseHandler (handler: Router.ApiHandler) {

  return (req: Router.Request, res: express.Response, next: express.NextFunction) => {
    return Promise.resolve(handler(req, customResponse(res), next))
      .then((response) => {
        if (!response) {
          return res.json()
        }

        if (!response._isCustomResponse) {
          // we're returning JSON here. If this is not
          // object or array then make and object out of it.
          if (!_.isPlainObject(response) && !_.isArray(response)) {
            response = {
              message: response
            }
          }

          return res.json(response)
        }
        /* istanbul ignore next */
        if (response._responseJson) {
          return res.json(response._responseJson)
        }
        /* istanbul ignore next */
        if (response._responseHtml) {
          return res.contentType('text/html').send(response._responseHtml)
        }
        /* istanbul ignore next */
        if (response._responseRedirect) {
          return res.redirect(response._responseRedirect)
        }
      })
      .catch((error) => {
        next(error)
      })
  }
}

function notFoundErrorHandler (
  req: Router.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  let response = _.merge(errorList['NotFound'], {
    uri: req.originalUrl
  }) as Router.ErrorResponse

  makeErrorResponse(req, response)

  const err = new Error('NotFound')
  logger.error(err, {
    uri: req.originalUrl,
    response
  })

  res
    .status(404)
    .json(response)
}

function errorHandler (
  err: any,
  req: Router.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (!err) {
    next()
    return
  }

  if (_.isString(err)) {
    err = new Error(err)
  }

  logger.error(err, err)

  const errCode = err.message
  let response

  // check if exists in the specified error list
  if (errCode && errorList[errCode]) {

    // allow to override details of the error response.
    // details can be attached to the thrown error under
    // the `details` key
    let overrideError = _.get(err, 'details')
    if (!_.isPlainObject(overrideError)) {
      overrideError = null
    }
    response = _.merge({}, errorList[errCode], overrideError)

    // we do not leak our internal errors and our code by retuning
    // errors with stack traces etc.
  } else {
    response = _.merge({}, errorList['UnexpectedError'])
  }

  let statusCode = +response.statusCode
  if (statusCode < 100 || statusCode > 599) {
    statusCode = 500
  }

  makeErrorResponse(req, response)

  res
    .status(statusCode)
    .json(response)
}

/**
 * For error responses attach `req_id` from the header if found
 * and add the error_id as well
 */
function makeErrorResponse (req: Router.Request, response: Router.ErrorResponse): void {
  response.error_id = uuid.v4()
  const requestId = _.get(req, 'headers.x-request-id')
  if (requestId) {
    response.request_id = requestId
  }
}

/**
 * Validates the schemas if it is set for specified route.
 */
const schemaValidator = (schemaConfig?: Router.RequestValidation) => {

  let validator = _.get(schemaConfig, 'validator')
  let toValidate = _.omit(schemaConfig, 'validator')

  return (req: Router.Request , res: express.Response, next: express.NextFunction) => {

    if (!validator) {
      next()
      return
    }

    for (let lookup in toValidate) {

      let schema = toValidate[lookup]
      let payload = req[lookup]

      if (payload) {
        const valid = validator.validate(schema, payload)
        if (valid !== true) {
          logger.info('schemaValidator() validation failed', {
            payload,
            path: req.originalUrl,
            errors: validator.errorsText()
          })
          const response = _.merge({}, errorList['InvalidRequest'], {
            fields: validator.errors.reduce((memo, err) => {
              let key = err.dataPath
              if (key[0] === '.') key = key.substring(1)
              if (key === '') memo.missing.push(err.message)
              else memo[key] = err.message
              return memo
            }, { missing: [] })
          }) as Router.ErrorResponse

          makeErrorResponse(req, response)
          const err = new Error('Validation failed in schemaValidator')
          logger.error(err, {
            uri: req.originalUrl,
            response
          })

          res.status(400).json(response)
          return
        }

      } else {

        logger.info(`validateSchema() empty ${lookup}`, {
          lookup,
          path: req.originalUrl,
          config: toValidate
        })
        next(new Error('UnexpectedError'))
        return
      }
    }

    next()

  }
}

const checkRequestSchemaConfig = (schemaConfig: Router.RequestValidation, route: string) => {
  if (!_.isPlainObject(schemaConfig)) {
    return
  }
  if (!_.isFunction(_.get(schemaConfig, 'validator.validate'))) {
    logger.critical(
      new Error('ERR_ROUTER_INVALID_ROUTE_SCHEMA_SPECIFIED'), {
        route,
        schemaConfig
      })
    process.exit()
  }
}

export function parseRoute (route: string): string {
  if (route[0] === '/') {
    return route.replace(/\//, '')
  }
  return route
}

export function composeRoute (root: string, namespace: string, route: string): string {
  if (_.isNil(namespace) || namespace === '') {
    return `/${root}/${parseRoute(route)}`
  }
  return `/${root}/${namespace}/${parseRoute(route)}`
}

function defineHttpRoute (
  route: string,
  root: string,
  handler: Router.ApiHandler,
  middleware?: any,
  schemaConfig?: Router.RequestValidation
) {
  checkRequestSchemaConfig(schemaConfig, route)

  app[this.method](`${composeRoute(root, namespace, route)}`,
    middleware,
    [schemaValidator(schemaConfig), responseHandler(handler), errorHandler]
  )
}

class HttpRouter {
  static GET (
    route: string,
    root: string,
    handler: Router.ApiHandler,
    middleware?: any,
    schemaConfig?: Router.RequestValidation
  ) {
    defineHttpRoute.apply({ method: 'get' }, arguments)
  }

  static POST (
    route: string,
    root: string,
    handler: Router.ApiHandler,
    middleware?: any,
    schemaConfig?: Router.RequestValidation
  ) {
    defineHttpRoute.apply({ method: 'post' }, arguments)
  }

  static PUT (
    route: string,
    root: string,
    handler: Router.ApiHandler,
    middleware?: any,
    schemaConfig?: Router.RequestValidation
  ) {
    defineHttpRoute.apply({ method: 'put' }, arguments)
  }

  static DELETE (
    route: string,
    root: string,
    handler: Router.ApiHandler,
    middleware?: any,
    schemaConfig?: Router.RequestValidation
  ) {
    defineHttpRoute.apply({ method: 'delete' }, arguments)
  }
}
function aggregateMiddlewares (config: Router.RoutesConfig): Array<express.RequestHandler | express.ErrorRequestHandler> {
  let middlewares: Array<express.RequestHandler | express.ErrorRequestHandler> = [ ]

  if (config && config.securityMiddlewares) {
    middlewares = middlewares.concat(config.securityMiddlewares)
  }
  if (config && config.parserMiddlewares) {
    middlewares = middlewares.concat(config.parserMiddlewares)
  } else {
    middlewares.push(errorManagedBodyParser)
  }
  if (config && config.errorMiddleware) {
    middlewares.push(config.errorMiddleware)
  }
  if (config && config.handlerMiddlewares) {
    middlewares = middlewares.concat(config.handlerMiddlewares)
  }
  return middlewares
}

/**
 * This function calls the body parser library, and
 * manages any error output into our standardised format
 * Ensuring the correct code & message for bodyParser errors
 * Error message & status are put into error.details which the
 * errorHandler function will merge into tge response
 */
function errorManagedBodyParser (req: Router.Request, res: express.Response, next: express.NextFunction) {
  bodyParser.json()(req, res, (err: Error) => {
    if (_.isNil(err)) {
      return next()
    }
    console.log(err)
    const parserErrorName: string = `InvalidRequest.${_.get(err, 'type')}`
    const errorTitle: string = errorList.hasOwnProperty(parserErrorName) ? parserErrorName : 'InvalidRequest'
    const bodyParserError: Logging.ErrorWithDetails = new Error(errorTitle) as Logging.ErrorWithDetails
    bodyParserError.details = {
      message: _.get(err, 'expose') === true && _.get(err, 'status', 500) !== 500 ? _.get(err, 'message') : undefined,
      statusCode: _.get(err, 'status')
    }
    next(bodyParserError)
  })
}

export class ExposedRouter {
  static GET (route: string, version: number, handler: Router.ApiHandler, config?: Router.RoutesConfig) {
    HttpRouter.GET(route, `v${version}`, handler, aggregateMiddlewares(config), _.get(config, 'schemaConfig'))
  }

  static POST (route: string, version: number, handler: Router.ApiHandler, config?: Router.RoutesConfig) {
    HttpRouter.POST(route, `v${version}`, handler, aggregateMiddlewares(config) , _.get(config, 'schemaConfig'))
  }

  static PUT (route: string, version: number, handler: Router.ApiHandler, config?: Router.RoutesConfig) {
    HttpRouter.PUT(route, `v${version}`, handler, aggregateMiddlewares(config) , _.get(config, 'schemaConfig'))
  }

  static DELETE (route: string, version: number, handler: Router.ApiHandler, config?: Router.RoutesConfig) {
    HttpRouter.DELETE(route, `v${version}`, handler, aggregateMiddlewares(config), _.get(config, 'schemaConfig'))
  }
}

export default {
  exposed: ExposedRouter
}
