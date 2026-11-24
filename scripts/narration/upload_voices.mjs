// Uploads a game recorded in several voices: <clipsDir>/<voice>/<key>.mp3 -> narration/<mode>/<voice>/<key>.mp3,
// and sets manifest.modes[mode] = { voices: { <voice>: [key…] } } (other games are kept).
// Optional: --whoami-fix <dir> <keysFile> uploads extra Who Am I? clips and sets whoami's clip list to keysFile.
// Uses the temporary uploader guest from upload.mjs --signup (uid-scoped storage policy needed).
globalThis.WebSocket = globalThis.WebSocket || class {}
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.online', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/159.0.8154.6 Safari/537.36'
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { global: { headers: { 'User-Agent': UA } }, auth: { persistSession: false } })
const args = process.argv.slice(2)
const [mode, dir] = args
const u = JSON.parse(readFileSync('/tmp/narr/uploader.json', 'utf8'))
const { error: e1 } = await sb.auth.refreshSession({ refresh_token: u.refresh })
if (e1) throw e1
async function put(path, file) {
  for (let t = 0; t < 3; t++) {
    const { error } = await sb.storage.from('narration').upload(path, readFileSync(file), { contentType: 'audio/mpeg', cacheControl: '31536000', upsert: true })
    if (!error) return null
    if (t === 2) return error.message
  }
}
const jobs = []
const voices = {}
for (const v of readdirSync(dir)) {
  const keys = readdirSync(`${dir}/${v}`).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).sort()
  voices[v] = keys
  for (const k of keys) jobs.push([`${mode}/${v}/${k}.mp3`, `${dir}/${v}/${k}.mp3`])
}
const fi = args.indexOf('--whoami-fix')
let whoKeys = null
if (fi > 0) {
  const fdir = args[fi + 1]
  for (const f of readdirSync(fdir).filter((f) => f.endsWith('.mp3'))) jobs.push([`whoami/${f}`, `${fdir}/${f}`])
  whoKeys = JSON.parse(readFileSync(args[fi + 2], 'utf8'))
}
let ok = 0; const fails = []
for (let i = 0; i < jobs.length; i += 10) {
  await Promise.all(jobs.slice(i, i + 10).map(async ([p, f]) => { const e = await put(p, f); if (e) fails.push(`${p}: ${e}`); else ok++ }))
}
console.log('uploaded', ok, 'failed', fails.length, fails.slice(0, 3))
if (fails.length) process.exit(1)
let man = { version: 1, modes: {} }
const { data: cur } = await sb.storage.from('narration').download('manifest.json')
if (cur) man = JSON.parse(await cur.text())
man.modes[mode] = { voices }
if (whoKeys) man.modes.whoami.clips = whoKeys
const { error: e2 } = await sb.storage.from('narration').upload('manifest.json', JSON.stringify(man), { contentType: 'application/json', cacheControl: '60', upsert: true })
console.log('manifest', e2 ? e2.message : 'ok', Object.fromEntries(Object.entries(voices).map(([v, k]) => [v, k.length])), whoKeys ? `whoami ${man.modes.whoami.clips.length}` : '')
writeFileSync('/tmp/narr/manifest.json', JSON.stringify(man))
