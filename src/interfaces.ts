import * as SequelizeStatic from 'sequelize'
import * as express from 'express'
import { logTypes } from './utils/logger'
type Omit<T, K> = Pick<T, Exclude<keyof T, K>>
type LimitTypeToBeObject<T> = T extends object ? T extends Array<any> ? {} : T : {}

export namespace Router {

  export interface ErrorResponse {
    'request_id'?: string
    'error_id'?: string,
    'message': string,
    'statusCode': number,
    'description'?: string,
    'err_code': number,
    'uri'?: string
  }

  export interface ExtendedRequest extends express.Request {
  }

  export type Request<T = {}> = Omit<ExtendedRequest, keyof LimitTypeToBeObject<T>> & LimitTypeToBeObject<T>

  export interface RequestValidation {
    validator: any,
    query?: any,
    body?: any,
    params?: any
  }
  export interface RoutesConfig {
    schemaConfig?: RequestValidation,
    securityMiddlewares?: express.RequestHandler[],
    errorMiddleware?: express.ErrorRequestHandler,
    parserMiddlewares?: express.RequestHandler[],
    handlerMiddlewares?: express.RequestHandler[]
  }
  export type ApiHandler = (req: Request, h: ResponseHandler, next: express.NextFunction) => Promise<any>

  export interface ResponseHandler {
    json: (data: object | string) => CustomResponse,
    html: (html: string) => CustomResponse,
    redirect: (url: string) => CustomResponse
    status: (code: number) => CustomResponse
  }

  export interface CustomResponse {
    _isCustomResponse: boolean,
    _responseJson?: object,
    _responseHtml?: string,
    _responseRedirect?: string,
  }
}

// Storage
export namespace Database {
  export interface Config extends SequelizeStatic.Options {}
  export interface Client extends SequelizeStatic.Sequelize {}
  export interface Model<TInstance, TAttributes> extends SequelizeStatic.Model<TInstance, TAttributes> {}
  export interface Instance<TAttributes> extends SequelizeStatic.Instance<TAttributes> {}
  export interface DefineAttributes extends SequelizeStatic.DefineAttributes {}
  export interface DefineOptions<TInstance> extends SequelizeStatic.DefineOptions<TInstance> {}
}

export namespace Transport {
  export interface TransportConfig {
    numMessages?: number,
    visibilityTimeout?: number,
    slidingWindow?: boolean,
    silent?: boolean
  }
  export interface QueueMessage {
    MessageId: string
    Message: string
    Timestamp: string
    Type: string
  }
  export interface TopicMessage extends QueueMessage {
    TopicArn: string
  }
}

// Main library interface

export namespace Lib {
  export interface Config {
    name: string
    version?: string
    database?: boolean
    service_root_uri?: string
    transport?: boolean
    database_config?: Database.Config
  }
}

export namespace Logging {
  export interface DefaultDecorators {
    service: string,
    [x: string]: Object
  }

  export interface InputDecorators {
    [x: string]: Object
  }
  export interface LoggerDecorators {
    service: string,
    component: string,
    [x: string]: Object
  }

  export interface LoggerPayload {
    service: string,
    component: string,
    level: string,
    message: string,
    [x: string]: Object
  }

  export interface Logger {
    decorators: LoggerDecorators,
    log: (level: logTypes, message: string, decorators?: InputDecorators) => void,
    debug: (message: string, decorators?: InputDecorators) => void,
    info: (message: string, decorators?: InputDecorators) => void,
    warn: (error: Error, decorators?: InputDecorators) => void,
    error: (error: Error, decorators?: InputDecorators) => void,
    critical: (error: Error, decorators?: InputDecorators) => void,
  }
  export interface ErrorWithDetails extends Error {
    details: object
  }
}

export namespace Support {
  export interface SchemaObject extends Object {
    $id?: string
    type?: string,
    maximum?: number,
    minimum?: number
  }
}
