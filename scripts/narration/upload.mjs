// Uploads narration clips + manifest to the public "narration" bucket using a temporary guest
// that a short-lived, uid-scoped storage policy allows to write. Usage:
//   node scripts/narration/upload.mjs <mode> <voice> <clipsDir> [--signup | --uid-file f]
globalThis.WebSocket = globalThis.WebSocket || class {}
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.online', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/159.0.8154.6 Safari/537.36'
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { global: { headers: { 'User-Agent': UA } }, auth: { persistSession: false } })
const [mode, voice, dir, flag] = process.argv.slice(2)
if (flag === '--signup') {
  const { data, error } = await sb.auth.signInAnonymously()
  if (error) throw error
  writeFileSync('/tmp/narr/uploader.json', JSON.stringify({ uid: data.user.id, refresh: data.session.refresh_token }))
  console.log('uploader', data.user.id)
  process.exit(0)
}
const u = JSON.parse(readFileSync('/tmp/narr/uploader.json', 'utf8'))
const { error: e1 } = await sb.auth.refreshSession({ refresh_token: u.refresh })
if (e1) throw e1
const files = readdirSync(dir).filter((f) => f.endsWith('.mp3'))
let ok = 0; const fails = []
for (let i = 0; i < files.length; i += 8) {
  await Promise.all(files.slice(i, i + 8).map(async (f) => {
    const { error } = await sb.storage.from('narration').upload(`${mode}/${f}`, readFileSync(`${dir}/${f}`), { contentType: 'audio/mpeg', cacheControl: '31536000', upsert: true })
    if (error) fails.push(`${f}: ${error.message}`); else ok++
  }))
}
console.log('uploaded', ok, 'failed', fails.length, fails.slice(0, 3))
// Manifest: merge with the existing one so other games' recordings stay listed.
let man = { version: 1, modes: {} }
const { data: cur } = await sb.storage.from('narration').download('manifest.json')
if (cur) { try { man = JSON.parse(await cur.text()) } catch {} }
man.modes[mode] = { voice, clips: files.map((f) => f.replace(/\.mp3$/, '')).sort() }
const { error: e2 } = await sb.storage.from('narration').upload('manifest.json', JSON.stringify(man), { contentType: 'application/json', cacheControl: '60', upsert: true })
console.log('manifest', e2 ? e2.message : 'ok', Object.keys(man.modes), man.modes[mode].clips.length)
writeFileSync(`/tmp/narr/manifest.json`, JSON.stringify(man))
