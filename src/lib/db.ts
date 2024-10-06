/// <reference types="vite/client" />

import type { Knex } from 'knex'
import knex from 'knex'
import configs from '../../knexfile.js'

function createConnectionManager() {
  let connection: Knex
  return function connect(config: Knex.Config) {
    if (!connection) {
      connection = knex(config)
    }
    return connection
  }
}

const connectionManager = createConnectionManager()

const envConfig = configs[import.meta.env.NODE_ENV ?? 'development']

export const db = connectionManager(envConfig)
