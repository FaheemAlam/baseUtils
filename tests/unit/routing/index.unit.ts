import { expect, assert } from 'chai'
import * as sinon from 'sinon'
import * as proxyquire from 'proxyquire'
import * as stream from 'stream'


proxyquire.noPreserveCache()

describe('#Routing', () => {
  let expressStub: any
  let ajvStub: any
  let RouterStub: any
  let jsonParserStub: any
  let uuidStub: any
  let LoggerStub: any
  let clshookedStub: any
  let routerInitModule: any
  let interfacesStub: any
  let clsNameSpace: any
  let sandbox: sinon.SinonSandbox
  beforeEach(() => {
    sandbox = sinon.createSandbox()
    expressStub = {
      Application: sandbox.stub()
    }
    ajvStub = sandbox.stub()
    jsonParserStub = sandbox.stub()
    uuidStub = sandbox.stub()
    LoggerStub = sandbox.stub()
    clshookedStub = sandbox.stub({ createNamespace: () => {} })
    clsNameSpace = {
      bindEmitter: sandbox.stub(),
      set: sandbox.stub(),
      run: (cb) => {
        cb()
      }
    }
    clshookedStub.createNamespace.returns(clsNameSpace)
    routerInitModule = sandbox.stub()
    interfacesStub = sandbox.stub()

    routerInitModule = proxyquire('../../../src/routing/index.ts', {
      'express': expressStub,
      'ajv': ajvStub,
      '../interfaces': interfacesStub,
      'body-parser': {
        json: jsonParserStub
      },
      'uuid': uuidStub,
      '../utility/logger': LoggerStub,
      'cls-hooked': clshookedStub
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#parseRoute', () => {
    it('should remove initial / if present', () => {
      const route = routerInitModule.parseRoute('/resource/subresource')
      expect(route).to.equal('resource/subresource')
    })

    it('should not remove any other / present', () => {
      const route = routerInitModule.parseRoute('resource/subresource')
      expect(route).to.equal('resource/subresource')
    })

  })

  describe('compose route', () => {
    it('should use namespace if provided', () => {
      const composedRoute = routerInitModule.composeRoute('root','namespace','route')
      expect(composedRoute).to.equal('/root/namespace/route')
    })

    it('should not use namespace if not provided', () => {
      const route = routerInitModule.composeRoute('root','','route')
      expect(route).to.equal('/root/route')
    })

  })

  describe('#init', () => {
    let sandbox: sinon.SinonSandbox
    let expressAppStub
    beforeEach(() => {
      sandbox = sinon.createSandbox()
      expressAppStub = sandbox.stub()
    })
    afterEach(() => {
      sandbox.restore()
    })
    it('should attach requestTrace and trigger registerErrorList', () => {
      const registerErrorListSpy = sandbox.spy(routerInitModule, 'registerErrorList')
      const listOfErrors = {}
      routerInitModule.init(expressAppStub, 'namespaceUri', listOfErrors)
      expect(registerErrorListSpy.firstCall.args[0]).to.equal(listOfErrors)
    })
    it('should use a default of an empty object for default listOfErrors', () => {
      const registerErrorListSpy = sandbox.spy(routerInitModule, 'registerErrorList')
      expect(registerErrorListSpy.firstCall.args[0]).to.deep.equal({})
    })
  })

  describe('#registerErrorList', () => {
    it('should attach requestTrace and trigger registerErrorList', () => {
      // Function modifies inaccessible items, and returns nothing, so test is only 'no error when called'
      const errorList = {
        'TeaPot': {
          'statusCode': 418,
          'message': 'I am a teapot'
        }
      }
      routerInitModule.registerErrorList()
    })
  })
  describe('#finalize', () => {
    let sandbox: sinon.SinonSandbox
    let expressAppStub
    beforeEach(() => {
      sandbox = sinon.createSandbox()
      expressAppStub = {
        use: sandbox.stub()
      }
      routerInitModule.init(expressAppStub, 'namespaceUri')
    })
    afterEach(() => {
      sandbox.restore()
    })
    it('should attach an error handler and a not found handler', () => {
      expressAppStub.use.resetHistory()
      routerInitModule.finalize()
      expect(expressAppStub.use.callCount).to.equal(2)
      expect(expressAppStub.use.firstCall.args[0]).to.be.a('function')
      expect(expressAppStub.use.firstCall.args[0].name).to.equal('errorHandler')
      expect(expressAppStub.use.lastCall.args[0]).to.be.a('function')
      expect(expressAppStub.use.lastCall.args[0].name).to.equal('notFoundErrorHandler')
    })
  })

  describe('ExposedRouter', () => {
    let sandbox: sinon.SinonSandbox
    let expressAppStub
    let exposed
    beforeEach(() => {
      sandbox = sinon.createSandbox()
      expressAppStub = {
        use: sandbox.stub(),
        get: sandbox.stub(),
        post: sandbox.stub(),
        put: sandbox.stub(),
        delete: sandbox.stub()
      }
      routerInitModule.init(expressAppStub, 'test')
      exposed = routerInitModule.default.exposed
    })
    afterEach(() => {
      sandbox.restore()
    })
    it('#GET attaches route, handler and middleware', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      exposed.GET('exposed/get/route', 1, handler, { schemaConfig })
      expect(expressAppStub.get.callCount).to.equal(1)
      expect(expressAppStub.get.firstCall.args.length).to.equal(3)
      const [route, sentMiddleware, other] = expressAppStub.get.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/v1/test/exposed/get/route')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(1)
      expect(sentMiddleware[0].name).to.equal('errorManagedBodyParser')
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
    it('#POST attaches route, handler and middleware', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      exposed.POST('exposed/get/route', 1, handler, { schemaConfig })
      expect(expressAppStub.post.callCount).to.equal(1)
      expect(expressAppStub.post.firstCall.args.length).to.equal(3)
      const [route, sentMiddleware, other] = expressAppStub.post.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/v1/test/exposed/get/route')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(1)
      expect(sentMiddleware[0].name).to.equal('errorManagedBodyParser')
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
    it('#POST attaches route, handler and custom middlewares', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      const parserMiddlewareStub = sandbox.stub()
      const parserMiddlewareStub2 = sandbox.stub()
      const securityMiddlewareStub = sandbox.stub()
      const securityMiddlewareStub2 = sandbox.stub()

      const errorMiddlewareStub = sandbox.stub()
      const errorMiddlewareStub2 = sandbox.stub()
      const handlerMiddlewaresStub = sandbox.stub()
      const handlerMiddlewaresStub2 = sandbox.stub()

      exposed.POST('exposed/get/route', 1, handler, {
        parserMiddlewares: [ parserMiddlewareStub, parserMiddlewareStub2 ],
        securityMiddlewares: [ securityMiddlewareStub, securityMiddlewareStub2 ],
        errorMiddleware: errorMiddlewareStub,
        handlerMiddlewares: [ handlerMiddlewaresStub, handlerMiddlewaresStub2 ],
        schemaConfig
      })
      expect(expressAppStub.post.callCount).to.equal(1)
      expect(expressAppStub.post.firstCall.args.length).to.equal(3)
      const [route, sentMiddleware, other] = expressAppStub.post.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/v1/test/exposed/get/route')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(7)
      expect(sentMiddleware[0].name).to.equal('proxy')
      expect(sentMiddleware[1]).to.equal(securityMiddlewareStub)
      expect(sentMiddleware[2]).to.equal(securityMiddlewareStub2)
      expect(sentMiddleware[3]).to.equal(parserMiddlewareStub)
      expect(sentMiddleware[4]).to.equal(parserMiddlewareStub2)
      expect(sentMiddleware[5]).to.equal(errorMiddlewareStub)
      expect(sentMiddleware[6]).to.equal(handlerMiddlewaresStub)
      expect(sentMiddleware[7]).to.equal(handlerMiddlewaresStub2)
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
    it('#DELETE attaches route, handler and middleware', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      exposed.DELETE('exposed/get/route', 1, handler, {
        schemaConfig
      })
      expect(expressAppStub.delete.callCount).to.equal(1)
      expect(expressAppStub.delete.firstCall.args.length).to.equal(3)
      const [route, sentMiddleware, other] = expressAppStub.delete.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/v1/test/exposed/get/route')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(1)
      expect(sentMiddleware[0].name).to.equal('expressPopulateProxyForwards')
      expect(sentMiddleware[1].name).to.equal('errorManagedBodyParser')
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
    it('#PUT attaches route, handler and middleware', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      exposed.PUT('exposed/get/route', 1, handler, { schemaConfig })
      expect(expressAppStub.put.callCount).to.equal(1)
      expect(expressAppStub.put.firstCall.args.length).to.equal(3)
      const [route, sentMiddleware, other] = expressAppStub.put.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/v1/test/exposed/get/route')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(1)
      expect(sentMiddleware[0].name).to.equal('expressPopulateProxyForwards')
      expect(sentMiddleware[1].name).to.equal('errorManagedBodyParser')
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
  })

  describe('ProtectedRouter', () => {
    let sandbox: sinon.SinonSandbox
    let expressAppStub
    let tokenProtected
    beforeEach(() => {
      sandbox = sinon.createSandbox()
      expressAppStub = {
        use: sandbox.stub(),
        get: sandbox.stub(),
        post: sandbox.stub(),
        put: sandbox.stub(),
        delete: sandbox.stub()
      }
      routerInitModule.init(expressAppStub, 'test')
      tokenProtected = routerInitModule.default.tokenProtected
    })
    afterEach(() => {
      sandbox.restore()
    })
    it('#GET attaches route, handler and middleware', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      tokenProtected.GET('exposed/get/route', 1, handler, { schemaConfig })
      expect(expressAppStub.get.callCount).to.equal(1)
      expect(expressAppStub.get.firstCall.args.length).to.equal(4)
      const [route, tracerMiddleware, sentMiddleware, other] = expressAppStub.get.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/v1/test/exposed/get/route')
      expect(tracerMiddleware).to.be.a('function')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(2)
      expect(sentMiddleware[0].name).to.equal('expressPopulateProxyForwards')
      expect(sentMiddleware[1].name).to.equal('errorManagedBodyParser')
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
    it('#POST attaches route, handler and middleware', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      tokenProtected.POST('exposed/get/route', 1, handler, { schemaConfig })
      expect(expressAppStub.post.callCount).to.equal(1)
      expect(expressAppStub.post.firstCall.args.length).to.equal(4)
      const [route, tracerMiddleware, sentMiddleware, other] = expressAppStub.post.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/v1/test/exposed/get/route')
      expect(tracerMiddleware).to.be.a('function')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(2)
      expect(sentMiddleware[0].name).to.equal('expressPopulateProxyForwards')
      expect(sentMiddleware[1].name).to.equal('errorManagedBodyParser')
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
    it('#POST attaches route, handler and custom middlewares', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      const parserMiddlewareStub = sandbox.stub()
      const parserMiddlewareStub2 = sandbox.stub()
      const securityMiddlewareStub = sandbox.stub()
      const securityMiddlewareStub2 = sandbox.stub()

      const errorMiddlewareStub = sandbox.stub()
      const errorMiddlewareStub2 = sandbox.stub()
      const handlerMiddlewaresStub = sandbox.stub()
      const handlerMiddlewaresStub2 = sandbox.stub()

      tokenProtected.POST('exposed/get/route', 1, handler, {
        parserMiddlewares: [ parserMiddlewareStub, parserMiddlewareStub2 ],
        securityMiddlewares: [ securityMiddlewareStub, securityMiddlewareStub2 ],
        errorMiddleware: errorMiddlewareStub,
        handlerMiddlewares: [ handlerMiddlewaresStub, handlerMiddlewaresStub2 ],
        schemaConfig
      })
      expect(expressAppStub.post.callCount).to.equal(1)
      expect(expressAppStub.post.firstCall.args.length).to.equal(4)
      const [route, tracerMiddleware, sentMiddleware, other] = expressAppStub.post.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/v1/test/exposed/get/route')
      expect(tracerMiddleware).to.be.a('function')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(8)
      expect(sentMiddleware[0].name).to.equal('expressPopulateProxyForwards')
      expect(sentMiddleware[1]).to.equal(securityMiddlewareStub)
      expect(sentMiddleware[2]).to.equal(securityMiddlewareStub2)
      expect(sentMiddleware[3]).to.equal(parserMiddlewareStub)
      expect(sentMiddleware[4]).to.equal(parserMiddlewareStub2)
      expect(sentMiddleware[5]).to.equal(errorMiddlewareStub)
      expect(sentMiddleware[6]).to.equal(handlerMiddlewaresStub)
      expect(sentMiddleware[7]).to.equal(handlerMiddlewaresStub2)
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
    it('#DELETE attaches route, handler and middleware', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      tokenProtected.DELETE('exposed/get/route', 1, handler, {
        schemaConfig
      })
      expect(expressAppStub.delete.callCount).to.equal(1)
      expect(expressAppStub.delete.firstCall.args.length).to.equal(4)
      const [route, tracerMiddleware, sentMiddleware, other] = expressAppStub.delete.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/v1/test/exposed/get/route')
      expect(tracerMiddleware).to.be.a('function')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(2)
      expect(sentMiddleware[0].name).to.equal('expressPopulateProxyForwards')
      expect(sentMiddleware[1].name).to.equal('errorManagedBodyParser')
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
    it('#PUT attaches route, handler and middleware', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      tokenProtected.PUT('exposed/get/route', 1, handler, { schemaConfig })
      expect(expressAppStub.put.callCount).to.equal(1)
      expect(expressAppStub.put.firstCall.args.length).to.equal(4)
      const [route, tracerMiddleware, sentMiddleware, other] = expressAppStub.put.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/v1/test/exposed/get/route')
      expect(tracerMiddleware).to.be.a('function')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(2)
      expect(sentMiddleware[0].name).to.equal('expressPopulateProxyForwards')
      expect(sentMiddleware[1].name).to.equal('errorManagedBodyParser')
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
  })

  describe('InternalRouter', () => {
    let sandbox: sinon.SinonSandbox
    let expressAppStub
    let internal
    beforeEach(() => {
      sandbox = sinon.createSandbox()
      expressAppStub = {
        use: sandbox.stub(),
        get: sandbox.stub(),
        post: sandbox.stub(),
        put: sandbox.stub(),
        delete: sandbox.stub()
      }
      routerInitModule.init(expressAppStub, 'test')
      internal = routerInitModule.default.internal
    })
    afterEach(() => {
      sandbox.restore()
    })
    it('#GET attaches route, handler and middleware', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      internal.GET('exposed/get/route', handler, { schemaConfig })
      expect(expressAppStub.get.callCount).to.equal(1)
      expect(expressAppStub.get.firstCall.args.length).to.equal(4)
      const [route, tracerMiddleware, sentMiddleware, other] = expressAppStub.get.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/internal/test/exposed/get/route')
      expect(tracerMiddleware).to.be.a('function')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(2)
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
    it('#POST attaches route, handler and middleware', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      internal.POST('exposed/get/route', handler, { schemaConfig })
      expect(expressAppStub.post.callCount).to.equal(1)
      expect(expressAppStub.post.firstCall.args.length).to.equal(4)
      const [route, tracerMiddleware, sentMiddleware, other] = expressAppStub.post.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/internal/test/exposed/get/route')
      expect(tracerMiddleware).to.be.a('function')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(2)
      expect(sentMiddleware[0].name).to.equal('expressPopulateProxyForwards')
      expect(sentMiddleware[1].name).to.equal('errorManagedBodyParser')
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
    it('#DELETE attaches route, handler and middleware', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      internal.DELETE('exposed/get/route', handler, { schemaConfig })
      expect(expressAppStub.delete.callCount).to.equal(1)
      expect(expressAppStub.delete.firstCall.args.length).to.equal(4)
      const [route, tracerMiddleware, sentMiddleware, other] = expressAppStub.delete.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/internal/test/exposed/get/route')
      expect(tracerMiddleware).to.be.a('function')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(2)
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
    it('#PUT attaches route, handler and middleware', () => {
      const handler = sandbox.stub()
      const schemaConfig = { validator: { validate: sandbox.stub() } }
      internal.PUT('exposed/get/route', handler, { schemaConfig })
      expect(expressAppStub.put.callCount).to.equal(1)
      expect(expressAppStub.put.firstCall.args.length).to.equal(4)
      const [route, tracerMiddleware, sentMiddleware, other] = expressAppStub.put.firstCall.args
      expect(other).to.be.an('array')
      expect(other.length).to.equal(3)
      const [schemaValidator, jsonResponse, errorHandler] = other
      expect(route).to.equal('/internal/test/exposed/get/route')
      expect(tracerMiddleware).to.be.a('function')
      expect(sentMiddleware).to.be.an('array')
      expect(sentMiddleware.length).to.equal(2)
      expect(sentMiddleware[0].name).to.equal('expressPopulateProxyForwards')
      expect(sentMiddleware[1].name).to.equal('errorManagedBodyParser')
      expect(schemaValidator).to.be.a('function')
      expect(jsonResponse).to.be.a('function')
      expect(errorHandler).to.be.a('function')
    })
  })

  describe('Private methods', () => {
    // exposure through stub arguments
    describe('#htmlResponse', () => {
      let sandbox: sinon.SinonSandbox
      let expressAppStub
      let internal
      beforeEach(() => {
        sandbox = sinon.createSandbox()
        expressAppStub = {
          use: sandbox.stub(),
          post: sandbox.stub()
        }
        routerInitModule.init(expressAppStub, 'test')
        internal = routerInitModule.default.internal
      })
      afterEach(() => {
        sandbox.restore()
      })
      it('should send the response to res.html', async () => {
        const expectedReturn: any = 'HTML'
        const handler = async (req, h) => { return h.html(expectedReturn) }
        internal.POST('exposed/get/route', handler)
        const responseHandler = expressAppStub.post.firstCall.args[3][1]
        const reqStub = sandbox.stub()
        const resStub = {
          contentType: sandbox.stub().returns({
            send: sandbox.stub()
          })
        }

        const nextStub = sandbox.stub()
        await responseHandler(reqStub, resStub, nextStub)

        expect(resStub.contentType).to.have.been.calledWith('text/html')
        expect(resStub.contentType().send).to.have.been.calledWith(expectedReturn)
      })
    })
    describe('#jsonResponse', () => {
      let sandbox: sinon.SinonSandbox
      let expressAppStub
      let internal
      beforeEach(() => {
        sandbox = sinon.createSandbox()
        expressAppStub = {
          use: sandbox.stub(),
          post: sandbox.stub()
        }
        routerInitModule.init(expressAppStub, 'test')
        internal = routerInitModule.default.internal
      })
      afterEach(() => {
        sandbox.restore()
      })
      it('should send the response to res.json', async () => {
        const expectedReturn: { foo: string } = { foo: 'bar' }
        const handler = sandbox.stub().resolves(expectedReturn)
        internal.POST('exposed/get/route', handler)
        const jsonResponse = expressAppStub.post.firstCall.args[3][1]
        const reqStub = sandbox.stub()
        const resStub = {
          json: sandbox.stub()
        }
        const nextStub = sandbox.stub()
        await jsonResponse(reqStub, resStub, nextStub)
        expect(resStub.json).to.have.been.calledWith(expectedReturn)
      })
      it('should send the response to res.redirect', async () => {
        const expectedReturn: string = 'https://globalid.net'
        const handler = async (req, h) => { return h.redirect(expectedReturn) }
        internal.POST('exposed/get/route', handler)
        const responseHandler = expressAppStub.post.firstCall.args[3][1]
        const reqStub = sandbox.stub()
        const resStub = {
          redirect: sandbox.stub()
        }
        const nextStub = sandbox.stub()
        await responseHandler(reqStub, resStub, nextStub)
        expect(resStub.redirect).to.have.been.calledWith(expectedReturn)
      })
      it('should send the response with status', async () => {
        const expectedReturn: number = 204
        const handler = async (req, h) => { h.status(expectedReturn) }
        internal.POST('exposed/get/route', handler)
        const responseHandler = expressAppStub.post.firstCall.args[3][1]
        const reqStub = sandbox.stub()
        const resStub = {
          status: sandbox.stub()
        }
        const nextStub = sandbox.stub()
        await responseHandler(reqStub, resStub, nextStub)
        expect(resStub.status).to.have.been.calledWith(expectedReturn)
      })
      it('should call a json response that is unwrapped if it is an object', async () => {
        const expectedReturn: any = { foo: 'bar' }
        const handler = async (req, h) => { h.json(expectedReturn) }
        internal.POST('exposed/get/route', handler)
        const responseHandler = expressAppStub.post.firstCall.args[3][1]
        const reqStub = sandbox.stub()
        const resStub = {
          json: sandbox.stub()
        }
        const nextStub = sandbox.stub()
        await responseHandler(reqStub, resStub, nextStub)
        // tslint:disable-next-line:no-unused-expression
        expect(resStub.json).to.have.been.called
      })
      it('should call a json response that is unwrapped if it is an array ', async () => {
        const expectedReturn: any = ['foo']
        const handler = async (req, h) => { h.json(expectedReturn) }
        internal.POST('exposed/get/route', handler)
        const responseHandler = expressAppStub.post.firstCall.args[3][1]
        const reqStub = sandbox.stub()
        const resStub = {
          json: sandbox.stub()
        }
        const nextStub = sandbox.stub()
        await responseHandler(reqStub, resStub, nextStub)
        // tslint:disable-next-line:no-unused-expression
        expect(resStub.json).to.have.been.called
      })
      it('should call a json response that is unwrapped if it is an array ', async () => {
        const expectedReturn: any = Error('non-standard')
        const handler = async (req, h) => { h.json(expectedReturn) }
        internal.POST('exposed/get/route', handler)
        const responseHandler = expressAppStub.post.firstCall.args[3][1]
        const reqStub = sandbox.stub()
        const resStub = {
          json: sandbox.stub()
        }
        const nextStub = sandbox.stub()
        await responseHandler(reqStub, resStub, nextStub)
        // tslint:disable-next-line:no-unused-expression
        expect(resStub.json).to.have.been.called
      })
      it('should send the response to res.json inside a message object if the response is not an object or array', async () => {
        const expectedReturn: { message: string } = { message: 'foo' }
        const handler = sandbox.stub().resolves('foo')
        internal.POST('exposed/get/route', handler)
        const jsonResponse = expressAppStub.post.firstCall.args[3][1]
        const reqStub = sandbox.stub()
        const resStub = {
          json: sandbox.stub()
        }
        const nextStub = sandbox.stub()
        await jsonResponse(reqStub, resStub, nextStub)
        expect(resStub.json.firstCall.args[0]).to.deep.equal(expectedReturn)
      })
      it('should call next with an error if an error occurs', async () => {
        const expectedError: Error = new Error('Expected error for jsonResponse')
        const expectedReturn: { foo: string } = { foo: 'bar' }
        const handler = sandbox.stub().resolves(expectedReturn)
        internal.POST('exposed/get/route', handler)
        const jsonResponse = expressAppStub.post.firstCall.args[3][1]
        const reqStub = sandbox.stub()
        const resStub = {
          json: sandbox.stub().throws(expectedError)
        }
        const nextStub = sandbox.stub()
        await jsonResponse(reqStub, resStub, nextStub)
        expect(nextStub.firstCall.args[0]).to.be.an('error')

      })
    })
    describe('#streamResponse', () => {
      let sandbox: sinon.SinonSandbox
      let expressAppStub
      let internal
      class ResponseStream extends stream.PassThrough {
        contentType (type: string) {
          return type
        }
      }
      beforeEach(() => {
        sandbox = sinon.createSandbox()
        expressAppStub = {
          use: sandbox.stub(),
          post: sandbox.stub()
        }
        routerInitModule.init(expressAppStub, 'test')
        internal = routerInitModule.default.internal
      })
      afterEach(() => {
        sandbox.restore()
      })
      it('should pipe stream to res', async () => {
        const expectedReturnStreamValue: any = 'dummy string'
        const readableStream: stream.PassThrough = new stream.PassThrough()
        const responseStream: ResponseStream = new ResponseStream()
        const headers: { [key: string]: string } = {
          'Content-Length': expectedReturnStreamValue.length.toString()
        }
        const handler = async (req, h) => { return h.stream(readableStream, headers) }
        internal.POST('exposed/get/route', handler)
        const responseHandler = expressAppStub.post.firstCall.args[3][1]
        const reqStub = sandbox.stub()

        let data = ''
        responseStream.on('data', (chunk) => {
          data += chunk
        })
        sinon.stub(responseStream, 'contentType')

        const nextStub = sandbox.stub()
        await responseHandler(reqStub, responseStream, nextStub)
        return new Promise(resolve => {
          responseStream.on('finish', () => {
            expect(data).to.deep.equal(expectedReturnStreamValue)
            expect(responseStream.contentType).to.have.been.calledWith('application/octet-stream')
            resolve()
          })
          readableStream.push(expectedReturnStreamValue)
          readableStream.push(null)
          readableStream.emit('end')
        })
      })
    })
    describe('#notFoundErrorHandler', () => {
      let sandbox: sinon.SinonSandbox
      let expressAppStub
      let notFoundErrorHandler
      beforeEach(() => {
        sandbox = sinon.createSandbox()
        expressAppStub = {
          use: sandbox.stub()
        }
        routerInitModule.init(expressAppStub, 'namespaceUri')
        routerInitModule.finalize()
        notFoundErrorHandler = expressAppStub.use.lastCall.args[0]
      })
      afterEach(() => {
        sandbox.restore()
      })
      it('should build a `not found` response', () => {
        const reqStub = sandbox.stub({ originalUrl: 'original/url' })
        const jsonStub = sandbox.stub()
        const statusStub = sandbox.stub().returns({ json: jsonStub })
        const resStub = {
          status: statusStub
        }
        const nextStub = sandbox.stub()
        notFoundErrorHandler(reqStub, resStub, nextStub)
        expect(statusStub.firstCall.args[0]).to.equal(404)
        const expected = {
          statusCode: 404,
          message: 'The resource you are looking for does not exist',
          uri: 'original/url'
        }
        expect(jsonStub.firstCall.args[0]).to.contain(expected)

      })
    })
    describe('#errorHandler', () => {
      let sandbox: sinon.SinonSandbox
      let expressAppStub
      let errorHandler
      beforeEach(() => {
        sandbox = sinon.createSandbox()
        expressAppStub = {
          use: sandbox.stub()
        }
        routerInitModule.init(expressAppStub, 'namespaceUri')
        expressAppStub.use.resetHistory()
        routerInitModule.finalize()
        errorHandler = expressAppStub.use.firstCall.args[0]
      })
      afterEach(() => {
        sandbox.restore()
        sandbox.resetHistory()
      })
      it('should build a 500 response', () => {
        const reqStub = sandbox.stub({ originalUrl: 'original/url' })
        const jsonStub = sandbox.stub()
        const statusStub = sandbox.stub().returns({ json: jsonStub })
        const resStub = {
          status: statusStub
        }
        const nextStub = sandbox.stub()
        const error = new Error('Expected error for errorHandler')
        errorHandler(error, reqStub, resStub, nextStub)
        expect(statusStub.firstCall.args[0]).to.equal(500)
        const expected = {
          statusCode: 500,
          message: 'There was an unexpected error. We have been alerted and are looking into it.'
        }
        expect(jsonStub.firstCall.args[0]).to.contain(expected)
      })
      it('should call next if there is no error', () => {
        const reqStub = sandbox.stub({ originalUrl: 'original/url' })
        const jsonStub = sandbox.stub()
        const statusStub = sandbox.stub().returns({ json: jsonStub })
        const resStub = {
          status: statusStub
        }
        const nextStub = sandbox.stub()
        errorHandler(undefined, reqStub, resStub, nextStub)
        // tslint:disable-next-line:no-unused-expression
        expect(nextStub).to.have.been.calledOnce
      })
      it('should accept an error code as a string and use the error type', () => {
        const reqStub = sandbox.stub({ originalUrl: 'original/url' })
        const jsonStub = sandbox.stub()
        const statusStub = sandbox.stub().returns({ json: jsonStub })
        const resStub = {
          status: statusStub
        }
        const nextStub = sandbox.stub()
        const error: string = 'NotFound'
        errorHandler(error, reqStub, resStub, nextStub)
        expect(statusStub.firstCall.args[0]).to.equal(404)
        const expected = {
          statusCode: 404,
          message: 'The resource you are looking for does not exist'
        }
        expect(jsonStub.firstCall.args[0]).to.contain(expected)
      })
      it('should accept extra details if available', () => {
        const errorList = {
          'TripleNine': {
            'statusCode': 999,
            'message': 'Triple Nine Error'
          }
        }
        routerInitModule.registerErrorList(errorList)
        const reqStub = sandbox.stub({ originalUrl: 'original/url', headers: { 'x-request-id': 'foo' } })
        const jsonStub = sandbox.stub()
        const statusStub = sandbox.stub().returns({ json: jsonStub })
        const resStub = {
          status: statusStub
        }
        const nextStub = sandbox.stub()

        interface ErrorDetails extends Error {
          details?: { foo: string }
        }

        const error: ErrorDetails = new Error('TripleNine')
        error.details = { foo: 'bar' }
        errorHandler(error, reqStub, resStub, nextStub)
        expect(statusStub.firstCall.args[0]).to.equal(500)
        const expected = {
          statusCode: 999,
          message: 'Triple Nine Error',
          foo: 'bar'
        }
        expect(jsonStub.firstCall.args[0]).to.contain(expected)
      })
    })
    describe('#schemaValidator', () => {
      let sandbox: sinon.SinonSandbox
      let expressAppStub
      let schemaValidator
      let validateStub
      beforeEach(() => {
        sandbox = sinon.createSandbox()
        expressAppStub = {
          use: sandbox.stub(),
          post: sandbox.stub()
        }
      })
      afterEach(() => {
        sandbox.restore()
        sandbox.resetHistory()
      })
      it('should validate a request parameter and send a json error if the request fails validation', () => {
        validateStub = sandbox.stub()
        const schemaConfig = {
          validator:
          {
            validate: validateStub,
            errorsText: sinon.stub().returns(['foo']),
            errors: [
              {
                dataPath: './one',
                message: 'error one'
              },
              {
                dataPath: '',
                message: 'error two'
              }
            ]
          },
          body: {}
        }
        routerInitModule.init(expressAppStub, 'namespaceUri')
        routerInitModule.default.internal.POST('exposed/get/route', sinon.stub(), { schemaConfig })
        schemaValidator = expressAppStub.post.firstCall.args[3][0]
        const reqStub = sandbox.stub({ originalUrl: 'original/url', body: {}, headers: { 'x-request-id': 'foo' } })
        const jsonStub = sandbox.stub()
        const statusStub = sandbox.stub().returns({ json: jsonStub })
        const resStub = {
          status: statusStub
        }
        const nextStub = sandbox.stub()
        schemaValidator(reqStub, resStub, nextStub)
        expect(statusStub.firstCall.args[0]).to.equal(400)
        const expected = {
          error_code: 'INVALID_REQUEST',
          fields: { missing: ['error two'], '/one': 'error one' },
          message: 'Invalid request',
          request_id: 'foo',
          statusCode: 400
        }
        expect(jsonStub.firstCall.args[0]).to.deep.include(expected)
        expect(jsonStub.firstCall.args[0]).to.have.property('error_id').to.be.a('string')
        expect(jsonStub.firstCall.args[0].error_id.length).to.equal(36)
        // tslint:disable-next-line:no-unused-expression
        expect(nextStub).to.not.have.been.called
      })
      it('should call next with an error if res does not have the required item', () => {
        validateStub = sandbox.stub()
        const schemaConfig = {
          validator:
          {
            validate: validateStub,
            errorsText: sinon.stub().returns(['foo']),
            errors: [
              {
                dataPath: './one',
                message: 'error one'
              },
              {
                dataPath: '',
                message: 'error two'
              }
            ]
          },
          body: {}
        }
        routerInitModule.init(expressAppStub, 'namespaceUri')
        routerInitModule.default.internal.POST('exposed/get/route', sinon.stub(), { schemaConfig })
        schemaValidator = expressAppStub.post.firstCall.args[3][0]
        const reqStub = sandbox.stub({ originalUrl: 'original/url' })
        const jsonStub = sandbox.stub()
        const statusStub = sandbox.stub().returns({ json: jsonStub })
        const resStub = {
          status: statusStub
        }
        const nextStub = sandbox.stub()
        schemaValidator(reqStub, resStub, nextStub)
        // tslint:disable-next-line:no-unused-expression
        expect(jsonStub).to.not.have.been.called
        // tslint:disable-next-line:no-unused-expression
        expect(nextStub.firstCall.args[0]).to.be.an('error')
        expect(nextStub.firstCall.args[0].message).to.equal('UnexpectedError')
      })
      it('should validate a request parameter and call next if it succeeds', () => {
        validateStub = sandbox.stub().returns(true)
        const schemaConfig = {
          validator:
          {
            validate: validateStub,
            errorsText: sinon.stub().returns(['foo']),
            errors: [
              {
                dataPath: './one',
                message: 'error one'
              },
              {
                dataPath: '',
                message: 'error two'
              }
            ]
          },
          body: {}
        }
        routerInitModule.init(expressAppStub, 'namespaceUri')
        routerInitModule.default.internal.POST('exposed/get/route', sinon.stub(), { schemaConfig })
        schemaValidator = expressAppStub.post.firstCall.args[3][0]
        const reqStub = sandbox.stub({ originalUrl: 'original/url', body: {} })
        const jsonStub = sandbox.stub()
        const statusStub = sandbox.stub().returns({ json: jsonStub })
        const resStub = {
          status: statusStub
        }
        const nextStub = sandbox.stub()
        schemaValidator(reqStub, resStub, nextStub)
        // tslint:disable-next-line:no-unused-expression
        expect(jsonStub).to.not.have.been.called
        // tslint:disable-next-line:no-unused-expression
        expect(nextStub).to.have.been.calledWithExactly()
      })
      it('should call next if there is no validator', () => {
        const schemaConfig = {
          body: {}
        }
        const processExitStub = sandbox.stub(process, 'exit')
        routerInitModule.init(expressAppStub, 'namespaceUri')
        routerInitModule.default.internal.POST('exposed/get/route', sinon.stub(), { schemaConfig })
        schemaValidator = expressAppStub.post.firstCall.args[3][0]
        const reqStub = sandbox.stub({ originalUrl: 'original/url', body: {} })
        const jsonStub = sandbox.stub()
        const statusStub = sandbox.stub().returns({ json: jsonStub })
        const resStub = {
          status: statusStub
        }
        const nextStub = sandbox.stub()
        schemaValidator(reqStub, resStub, nextStub)
        // tslint:disable-next-line:no-unused-expression
        expect(jsonStub).to.not.have.been.called
        // tslint:disable-next-line:no-unused-expression
        expect(nextStub).to.have.been.calledWithExactly()
      })
    })
    describe('#requestTrace', () => {
      let sandbox: sinon.SinonSandbox
      let expressAppStub
      beforeEach(() => {
        sandbox = sinon.createSandbox()
        expressAppStub = {
          use: sandbox.stub()
        }
      })
      afterEach(() => {
        sandbox.restore()
      })
      it('should call next after loggerNamespace bindings', () => {
        const registerErrorListSpy = sandbox.spy(routerInitModule, 'registerErrorList')
        const listOfErrors = {}
        routerInitModule.init(expressAppStub, 'namespaceUri', listOfErrors, sandbox.stub())
        const requestTrace = expressAppStub.use.firstCall.args[0]
        const reqStub = sandbox.stub({ headers: { 'x-request-id': 'foo' } })
        const resStub = sandbox.stub()
        const nextStub = sandbox.stub()
        requestTrace(reqStub, resStub, nextStub)
        expect(clsNameSpace.bindEmitter).to.have.been.calledWith(reqStub)
        expect(clsNameSpace.bindEmitter).to.have.been.calledWith(resStub)
        expect(clsNameSpace.set).to.have.been.calledWith('request_id', 'foo')
        expect(nextStub).to.have.been.calledWithExactly()
      })
    })
    describe('#errorManagedBodyParser', () => {
      let sandbox: sinon.SinonSandbox
      let expressAppStub
      let errorManagedBodyParser
      let reqStub: sinon.SinonStub
      let resStub: sinon.SinonStub
      let nextStub: sinon.SinonStub
      let managedStub: sinon.SinonStub
      beforeEach(() => {
        sandbox = sinon.createSandbox()
        expressAppStub = {
          use: sandbox.stub(),
          post: sandbox.stub()
        }
        reqStub = sandbox.stub()
        resStub = sandbox.stub()
        nextStub = sandbox.stub()
        managedStub = sandbox.stub()
        jsonParserStub.returns(managedStub)
        routerInitModule.init(expressAppStub, 'namespaceUri')
        routerInitModule.default.internal.POST('exposed/get/route', sinon.stub())
        errorManagedBodyParser = expressAppStub.post.firstCall.args[2][1]
      })
      afterEach(() => {
        sandbox.restore()
        sandbox.resetHistory()
      })
      it('should call the managed stub with req, res, and a function for error callback management', () => {
        errorManagedBodyParser(reqStub, resStub, nextStub)
        expect(managedStub.callCount).to.equal(1)
        expect(managedStub.lastCall.args.length).to.equal(3)
        expect(managedStub.lastCall.args[0]).to.equal(reqStub)
        expect(managedStub.lastCall.args[1]).to.equal(resStub)
        expect(managedStub.lastCall.args[2]).to.be.a('function')
      })
      it('should call next without an error if not given an error', () => {
        errorManagedBodyParser(reqStub, resStub, nextStub)
        expect(managedStub.callCount).to.equal(1)
        const errorManagementCallback = managedStub.lastCall.args[2]
        expect(nextStub.callCount).to.equal(0)
        errorManagementCallback()
        expect(nextStub.callCount).to.equal(1)
        expect(nextStub.lastCall.args.length).to.equal(0)
      })
      it('should call next with a known error, containing message and statusCode in details', () => {
        errorManagedBodyParser(reqStub, resStub, nextStub)
        expect(managedStub.callCount).to.equal(1)
        const errorManagementCallback = managedStub.lastCall.args[2]
        expect(nextStub.callCount).to.equal(0)
        const error = new Error('This Charset is an unsupported one, sorry')
        error.status = 415
        error.type = 'charset.unsupported'
        error.expose = true
        errorManagementCallback(error)
        expect(nextStub.callCount).to.equal(1)
        expect(nextStub.lastCall.args.length).to.equal(1)
        const sentError = nextStub.lastCall.args[0]
        expect(sentError.message).to.equal('InvalidRequest.charset.unsupported')
        expect(sentError.details).to.eql({
          message: 'This Charset is an unsupported one, sorry',
          statusCode: 415
        })
      })
      it('should call next with a known error, with statusCode in detailsm but undefined message where exposed is false', () => {
        errorManagedBodyParser(reqStub, resStub, nextStub)
        expect(managedStub.callCount).to.equal(1)
        const errorManagementCallback = managedStub.lastCall.args[2]
        expect(nextStub.callCount).to.equal(0)
        const error = new Error('This Charset is an unsupported one, sorry')
        error.status = 415
        error.type = 'charset.unsupported'
        error.expose = false
        errorManagementCallback(error)
        expect(nextStub.callCount).to.equal(1)
        expect(nextStub.lastCall.args.length).to.equal(1)
        const sentError = nextStub.lastCall.args[0]
        expect(sentError.message).to.equal('InvalidRequest.charset.unsupported')
        expect(sentError.details).to.eql({
          message: undefined,
          statusCode: 415
        })
      })

      it('should call next with an unknown error, containing message and statusCode in details', () => {
        errorManagedBodyParser(reqStub, resStub, nextStub)
        expect(managedStub.callCount).to.equal(1)
        const errorManagementCallback = managedStub.lastCall.args[2]
        expect(nextStub.callCount).to.equal(0)
        const error = new Error('This Charset is too foo to bar')
        error.status = 499
        error.type = 'charset.foobar'
        error.expose = true
        errorManagementCallback(error)
        expect(nextStub.callCount).to.equal(1)
        expect(nextStub.lastCall.args.length).to.equal(1)
        const sentError = nextStub.lastCall.args[0]
        expect(sentError.message).to.equal('InvalidRequest')
        expect(sentError.details).to.eql({
          message: 'This Charset is too foo to bar',
          statusCode: 499
        })
      })

      it('should call next and not expose the message the when errors status is not defined', () => {
        errorManagedBodyParser(reqStub, resStub, nextStub)
        expect(managedStub.callCount).to.equal(1)
        const errorManagementCallback = managedStub.lastCall.args[2]
        expect(nextStub.callCount).to.equal(0)
        const error = new Error('This Charset is too foo to bar')
        error.type = 'charset.foobar'
        error.expose = true
        errorManagementCallback(error)
        expect(nextStub.callCount).to.equal(1)
        expect(nextStub.lastCall.args.length).to.equal(1)
        const sentError = nextStub.lastCall.args[0]
        expect(sentError.message).to.equal('InvalidRequest')
        expect(sentError.details).to.eql({
          message: undefined,
          statusCode: undefined
        })
      })

      it('should call next and not expose the message when the errors status is 500', () => {
        errorManagedBodyParser(reqStub, resStub, nextStub)
        expect(managedStub.callCount).to.equal(1)
        const errorManagementCallback = managedStub.lastCall.args[2]
        expect(nextStub.callCount).to.equal(0)
        const error = new Error('This Charset is too foo to bar')
        error.type = 'charset.foobar'
        error.expose = true
        error.status = 500
        errorManagementCallback(error)
        expect(nextStub.callCount).to.equal(1)
        expect(nextStub.lastCall.args.length).to.equal(1)
        const sentError = nextStub.lastCall.args[0]
        expect(sentError.message).to.equal('InvalidRequest')
        expect(sentError.details).to.eql({
          message: undefined,
          statusCode: 500
        })
      })
    })
  })

})
