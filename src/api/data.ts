import type { ClientRequest, ServerResponse } from 'node:http'

export default async (req: ClientRequest, res: ServerResponse) => {
  const response = await fetch(
    'https://ungh.cc/repos/barelyhuman/minweb-public-data/files/main/data/links.json'
  ).then(d => d.json())

  let data = []
  try {
    data = JSON.parse(response.file.contents)
  } catch (err) {
    console.error('Failed to get data')
  }

  res.setHeader('Content-type', 'application/json')
  return res.end(JSON.stringify(data))
}
