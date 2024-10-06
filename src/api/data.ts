import type { ClientRequest, ServerResponse } from 'node:http'
import { createScheduledMonitor } from '../lib/createCacheMonitor.js'
import { fetchFromCache } from '../lib/fetchFromCache.js'
import { updateSiteCache } from '../lib/updateSiteCache.js'
import { appConfig } from '../lib/env.js'

const startCacheMonitor = createScheduledMonitor(updateSiteCache)

export default async (req: ClientRequest, res: ServerResponse) => {
  const data = await fetchFromCache(() => updateSiteCache())
  startCacheMonitor(appConfig.updateDelay)
  res.setHeader('Content-type', 'application/json')
  return res.end(JSON.stringify(data))
}
