// Uploads the one-voice-per-game clips: <clipsDir>/<mode>/<key>.mp3 -> narration/<mode>/<key>.mp3, and
// writes manifest-next.json = the live manifest.json plus { voice, clips } for each of these games.
// The live manifest.json is NOT changed; at publish time copy manifest-next.json over it
// (node scripts/narration/upload_games.mjs --promote). Uses the temporary uploader guest.
globalThis.WebSocket = globalThis.WebSocket || class {}
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.online', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/159.0.8154.6 Safari/537.36'
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { global: { headers: { 'User-Agent': UA } }, auth: { persistSession: false } })
const PLAN = { picture: 'kore', hidden: 'vindemiatrix', mystery: 'charon', wisdom: 'gacrux', parables: 'algieba', geography: 'kore', sequence: 'gacrux' }
const u = JSON.parse(readFileSync('/tmp/narr/uploader.json', 'utf8'))
const { error: e1 } = await sb.auth.refreshSession({ refresh_token: u.refresh })
if (e1) throw e1
const putJson = (name, obj) => sb.storage.from('narration').upload(name, JSON.stringify(obj), { contentType: 'application/json', cacheControl: '60', upsert: true })
const getJson = async (name) => { const { data } = await sb.storage.from('narration').download(name); return data ? JSON.parse(await data.text()) : null }
if (process.argv[2] === '--promote') {
  const next = await getJson('manifest-next.json'); if (!next) throw new Error('no manifest-next.json')
  const { error } = await putJson('manifest.json', next)
  console.log('promote', error ? error.message : 'ok', Object.keys(next.modes)); process.exit(error ? 1 : 0)
}
const dir = process.argv[2]
const jobs = []; const man = (await getJson('manifest.json')) ?? { version: 1, modes: {} }
for (const [mode, voice] of Object.entries(PLAN)) {
  const keys = readdirSync(`${dir}/${mode}`).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).sort()
  man.modes[mode] = { voice, clips: keys }
  for (const k of keys) jobs.push([`${mode}/${k}.mp3`, `${dir}/${mode}/${k}.mp3`])
}
let ok = 0; const fails = []
for (let i = 0; i < jobs.length; i += 10) {
  await Promise.all(jobs.slice(i, i + 10).map(async ([p, f]) => {
    for (let t = 0; t < 3; t++) {
      const { error } = await sb.storage.from('narration').upload(p, readFileSync(f), { contentType: 'audio/mpeg', cacheControl: '31536000', upsert: true })
      if (!error) { ok++; return }
      if (t === 2) fails.push(`${p}: ${error.message}`)
    }
  }))
}
console.log('uploaded', ok, 'failed', fails.length, fails.slice(0, 3))
if (fails.length) process.exit(1)
const { error: e2 } = await putJson('manifest-next.json', man)
console.log('manifest-next', e2 ? e2.message : 'ok', Object.fromEntries(Object.entries(man.modes).map(([m, v]) => [m, (v.clips ?? Object.values(v.voices ?? {}).flat()).length])))
writeFileSync('/tmp/narr/g/manifest-next.json', JSON.stringify(man))
