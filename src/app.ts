import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import GhostAdminAPI from '@tryghost/admin-api'
import yaml from 'js-yaml'

const { GHOST_API_URL, GHOST_ADMIN_API_KEY, PORT = '3000' } = process.env
if (!GHOST_API_URL || !GHOST_ADMIN_API_KEY) process.exit(1)

const app = new Hono()
const ghost = new GhostAdminAPI({ url: GHOST_API_URL, key: GHOST_ADMIN_API_KEY, version: 'v5.0' })

app.post('/api/member-notes', async (c) => {
  const { uuid } = (await c.req.json()) as { uuid?: string }
  if (!uuid) return c.json({ error: 'uuid is required' }, 400)
  try {
    const members = await ghost.members.browse({
      filter: `uuid:${uuid}`,
      limit: 1,
      fields: 'note'
    })
    const member = members[0]
    if (!member) return c.json({ error: 'Member not found' }, 404)
    const notesYaml = member.note || ''
    let data: any
    try {
      data = yaml.load(notesYaml)
    } catch (e: any) {
      return c.json({ error: 'Failed to parse YAML', details: e.message }, 500)
    }
    return c.json({ raw: notesYaml, data })
  } catch (e: any) {
    console.error(e)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/health', (c) => c.json({ status: 'ok' }))

serve({ fetch: app.fetch, port: Number(PORT) })
