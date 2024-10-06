export const createScheduledMonitor = (updaterFunc: () => any | Promise<any>) => {
  let handle: NodeJS.Timeout
  return function startCacheMonitor(delay = 30000) {
    if (handle) return
    handle = setInterval(() => {
      updaterFunc()
    }, delay)
    handle.unref()
    return () => {
      clearInterval(handle)
    }
  }
}
