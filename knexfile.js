const config = {
  client: 'better-sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: './cache.sqlite3',
  },
}

const proxyConfig = new Proxy(config, {
  get(t, p, r) {
    return config
  },
})

/**@type { Object.<string, import("knex").Knex.Config> }*/
export default proxyConfig
