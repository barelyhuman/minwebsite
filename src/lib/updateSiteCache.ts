import { db } from './db.js'

export const updateSiteCache = async () => {
  await db('sites').where({}).delete()

  const response = await fetch(
    'https://ungh.cc/repos/barelyhuman/minweb-public-data/files/main/data/links.json'
  ).then(d => d.json())
  let data = []

  try {
    data = JSON.parse(response.file.contents)
  } catch (err) {
    console.error('Failed to get data')
  }

  const insertSite = async site => {
    const exists = await db('sites')
      .where({
        link: site.link,
      })
      .first()
    if (exists) return
    return await db('sites').insert(site, 'id')
  }

  await Promise.all(data.map(d => insertSite(d)))
  return await db('sites').where({})
}
