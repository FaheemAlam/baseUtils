import * as Sequelize from 'sequelize'
import { Database } from '../interfaces'
import * as Umzug from 'umzug'
import * as decamelize from 'decamelize'

const defaultConfig: Database.Config = {
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306
}

export const sequelize: Sequelize.SequelizeStatic = Sequelize
export let client: Database.Client

export async function init
(config: Database.Config, serviceUri: string): Promise<Database.Client> {

  // Config and client setup
  const envConfig: Database.Config = collectEnvironmentSettings()
  const conf = Object.assign({}, defaultConfig, envConfig, config)
  const dbLogging = ['true', '1'].indexOf(process.env.DATABASE_LOGGING) !== -1
  if (dbLogging) {
    conf.logging = console.log
  } else {
    conf.logging = false
  }
  client = await createClient(conf)

  // Init connection and run migrations
  await client.authenticate()
  const migrator = new Umzug({
    storage: 'sequelize',
    storageOptions: {
      tableName: `migrations_${serviceUri}`,
      sequelize: client
    },
    migrations: {
      params: [
        client.getQueryInterface(), // queryInterface
        client.constructor,
        client
      ]
    }
  })
  try {
    const executedMigrations = await migrator.up()
  } catch (e) {
    console.error(e, e.stack)
    throw e
  }
  // TODO: Log executed migrations
  return client
}

export function registerModels (
  Models: {[key: string]: Database.DefineAttributes},
  ModelsOptions?: any
) {
  const models: any = {}
  for (let name in Models) {
    if (ModelsOptions !== undefined && ModelsOptions.hasOwnProperty(name + 'Options')) {
      models[name] = createModel(name, Models[name], ModelsOptions[name + 'Options'])
    } else {
      models[name] = createModel(name, Models[name])
    }
  }
  return models
}

export function createModel<TAttributes>
(modelName: string, attributes: Database.DefineAttributes,
 options?: Database.DefineOptions<Database.Instance<TAttributes>>):
 Sequelize.Model<Database.Instance<TAttributes>, TAttributes> {
  // Need an active client to define models
  if (!client) throw new Error('MISSING_SEQUELIZE_CLIENT')
  const seqOptions = Object.assign({}, {
    tableName: decamelize(modelName),
    underscored: true
  }, options)
  return client.define(modelName, attributes, seqOptions)
}

function collectEnvironmentSettings (): Database.Config {
  const envConfig: Database.Config = {}
  // Setup environment config variables
  if ('DATABASE_HOST' in process.env) {
    envConfig.host = process.env.DATABASE_HOST
  }

  if ('DATABASE_PORT' in process.env) {
    envConfig.port = parseInt(process.env.DATABASE_PORT, 10)
  }

  if ('DATABASE_USERNAME' in process.env) {
    envConfig.username = process.env.DATABASE_USERNAME
  }

  if ('DATABASE_PASSWORD' in process.env) {
    envConfig.password = process.env.DATABASE_PASSWORD
  }

  if ('DATABASE_NAME' in process.env) {
    envConfig.database = process.env.DATABASE_NAME
  }
  return envConfig
}

async function createClient (conf: Database.Config): Promise<Database.Client> {
  if ('DATABASE_CONNECTION_URL' in process.env) {
    return new Sequelize(process.env.DATABASE_CONNECTION_URL, conf)
  } else {
    if (conf.username && conf.password && conf.database && conf.host && conf.port) {
      return new Sequelize(conf)
    } else {
      throw new Error('INVALID_CONFIGURATION')
    }
  }
}

function getClient () {
  return client
}

export default {
  getClient,
  init,
  registerModels,
  Sequelize: Sequelize,
  // we already have getClient() but this one
  // is better..
  /* istanbul ignore next - can't record coverage of getters, this code is covered */
  get client () {
    /* istanbul ignore next - can't record coverage of getters, this code is covered */
    return client
  }
}
