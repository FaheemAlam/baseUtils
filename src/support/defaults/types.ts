'use strict'

// Base types for globaliD schemas

// const UUID_PATTERNS = {
//  // https://github.com/chriso/validator.js/blob/master/lib/isUUID.js
//  3: /^[0-9A-F]{8}-[0-9A-F]{4}-3[0-9A-F]{3}-[0-9A-F]{4}-[0-9A-F]{12}$/i,
//  4: /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
//  5: /^[0-9A-F]{8}-[0-9A-F]{4}-5[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
//  all: /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
// }

const DATE_ISO_UTC = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/

const GID_NAME_REGEX = /^([A-Za-z]{1,1}|[A-Za-z0-9_]{2,15})$/

export const globaliD = {
  $id: '/globaliD',
  type: 'string',
  // must be a string which is then used with new RegExp()
  // source is used for that (.toString() and others do not work)
  pattern: GID_NAME_REGEX.source
}

export const uuid = {
  $id: '/UUID',
  type: 'string',
  format: 'uuid'
}

export const dateUTC = {
  $id: '/Date_UTC',
  type: 'string',
  // must be a string which is then used with new RegExp()
  // source is used for that (.toString() and others do not work)
  pattern: DATE_ISO_UTC.source
}

export const currency = {
  $id: '/Currency',
  type: 'string',
  minLength: 3,
  maxLength: 10
}

export const IPv4 = {
  $id: '/IPv4',
  type: 'string',
  format: 'ipv4'
}

export const Latitude = {
  $id: '/Latitude',
  type: 'number',
  maximum: 90,
  minimum: -90
}
export const Longitude = {
  $id: '/Longitude',
  type: 'number',
  maximum: 180,
  minimum: -180
}
