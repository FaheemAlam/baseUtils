/**
 * Schema validation
 * can be used by routers etc.
 */

import * as Ajv from 'ajv'
import { Support } from '../interfaces'
import SchemaObject = Support.SchemaObject

export const validator = new Ajv({
  // check all, do not stop at first invalid prop
  allErrors: true,
  // modify objects while validating; use defaults
  // if missing
  useDefaults: true
})

// Validator using all schemas as the above
// one but will coerce types to the required
// type if possible.
export const validatorCoerced = new Ajv({
  allErrors: true,
  useDefaults: true,

  // https://github.com/epoberezkin/ajv#coercing-data-types
  // coerce types, for example when using querystring
  // ?page=0  -> will become page='1'
  // with coerceTypes '1' will be parsed to 1
  coerceTypes: true
})

export const addSchema = (schema: SchemaObject, id?: string): void => {
  validator.addSchema(schema, id || schema.$id)
  validatorCoerced.addSchema(schema, id || schema.$id)
}

export const addSchemas = (schemas: Object | SchemaObject[] /* object or array */): void => {
  for (let key in schemas) {
    let schema = schemas[key]
    addSchema(schema, schema.$id)
  }
}

export const addSchemasRecursive = (schemas: Object | SchemaObject[]): void => {
  for (let key in schemas) {
    let schema = schemas[key]
    if (schema.$id) {
      addSchema(schema)
    } else {
      addSchemasRecursive(schema)
    }
  }
}

/**
 * Helper to verify the json object
 * against the schema
 * returns true if valid
 * or list of errors if not valid
 */
export const isValid = (json: any, schema: any) => {
  const valid = validator.validate(
    schema,
    json
  )
  if (valid === true) {
    return true
  }

  // errors are collected directly on validator
  return validator.errors.reduce((memo, err) => {
    let key = err.dataPath
    if (key[0] === '.') key = key.substring(1)
    if (key === '') memo.missing.push(err.message)
    else memo[key] = err.message
    return memo
  }, { missing: [] })
}

// add basic types
addSchemas(require('./defaults/types'))
