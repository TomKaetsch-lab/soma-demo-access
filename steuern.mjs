// Steuert die Freigabe der SOMA-Body-Lab-Demo (Q65): access.json in diesem Ordner, dem Repo
// soma-demo-access. Playtest öffnen und schließen, Tester hinzufügen und entfernen, Enddatum für alle,
// Stand ansehen; jede Änderung wird gleich committet und gepusht (die Demo liest die Datei auf GitHub).
//   Doppelklick auf „Freigabe steuern.bat“ (Menü), oder:
//   node steuern.mjs stand
//   node steuern.mjs auf
//   node steuern.mjs zu ["Meldung für die Tester"]
//   node steuern.mjs neu "Name" [JJJJ-MM-TT]
//   node steuern.mjs weg "Name"
//   node steuern.mjs ende JJJJ-MM-TT      (oder: ende -   für ohne Enddatum)
// Ein Schlüssel heißt SOMA-XXXX-XXXX-XXXX-XXXX. In access.json steht nur sein SHA-256, gerechnet wie in der
// Demo (Physics: electron/demo-access.cjs, nur Buchstaben und Ziffern, groß). Die Schlüssel selbst schreibt
// das Skript zusätzlich in schluessel.txt, nur auf diesem Rechner (.gitignore, nie gepusht).
// Vorlage und Test im Physics-Repo: docs/demo-access/ und tests/demo-access.test.js.
import { createHash, randomInt } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const FILE = join(here, 'access.json')
const KEYS = join(here, 'schluessel.txt')
const LIVE = 'https://raw.githubusercontent.com/TomKaetsch-lab/soma-demo-access/main/access.json'
// SOMA_NO_GIT=1: nur die Datei ändern, ohne pull, commit und push (zum Ausprobieren).
const noGit = process.env.SOMA_NO_GIT === '1'

export const normalizeKey = (key) => String(key ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
export const hashKey = (key) => createHash('sha256').update(normalizeKey(key)).digest('hex')
const KEY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function newKey() {
  const characters = Array.from({ length: 16 }, () => KEY_ALPHABET[randomInt(KEY_ALPHABET.length)])
  return ['SOMA', ...[0, 4, 8, 12].map((start) => characters.slice(start, start + 4).join(''))].join('-')
}
export const isDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && Number.isFinite(Date.parse(value))

// access.json mit einem Tester je Zeile (gut lesbar und auf github.com leicht zu ändern).
export function format(data) {
  const lines = Object.entries(data).filter(([key]) => key !== 'testers').map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
  const testers = (data.testers ?? []).map((tester) => `    ${JSON.stringify(tester)}`)
  lines.push(`  "testers": [${testers.length ? `\n${testers.join(',\n')}\n  ` : ''}]`)
  return `{\n${lines.join(',\n')}\n}\n`
}

// Die Änderungen an den Daten (ohne Datei und Git); jede gibt die Commit-Meldung oder einen Fehler.
const sameName = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase()
export const actions = {
  auf(data) {
    if (data.open === true) return { error: 'Der Playtest ist schon offen.' }
    data.open = true
    return { commit: 'Playtest geöffnet' }
  },
  zu(data, message) {
    if (data.open === false && !message) return { error: 'Der Playtest ist schon geschlossen.' }
    data.open = false
    if (message) data.message = message
    return { commit: 'Playtest geschlossen' }
  },
  neu(data, name, until) {
    name = String(name ?? '').trim()
    if (!name) return { error: 'Bitte einen Namen angeben.' }
    if (until && !isDay(until)) return { error: `Kein Datum: ${until} (so: 2026-11-30)` }
    data.testers = Array.isArray(data.testers) ? data.testers : []
    if (data.testers.some((tester) => sameName(tester.name, name))) return { error: `Es gibt schon einen Tester „${name}“.` }
    const key = newKey()
    data.testers.push({ name, key: hashKey(key), ...(until ? { until } : {}) })
    return { commit: `Tester ${name} hinzugefügt`, key }
  },
  weg(data, name) {
    const testers = Array.isArray(data.testers) ? data.testers : []
    const left = testers.filter((tester) => !sameName(tester.name, name))
    if (left.length === testers.length) return { error: `Keinen Tester „${name ?? ''}“ gefunden. Da sind: ${testers.map((tester) => tester.name).join(', ') || 'keine'}` }
    data.testers = left
    return { commit: `Tester ${String(name).trim()} entfernt` }
  },
  ende(data, day) {
    if (day === '-' || day === '') {
      if (data.until == null) return { error: 'Es gibt kein Enddatum.' }
      delete data.until
      return { commit: 'Enddatum entfernt' }
    }
    if (!isDay(day)) return { error: `Kein Datum: ${day ?? ''} (so: 2026-12-31, oder - für ohne)` }
    data.until = day
    return { commit: `Enddatum ${day}` }
  },
}

export function describe(data) {
  const testers = Array.isArray(data.testers) ? data.testers : []
  return [
    `Playtest: ${data.open === true ? 'OFFEN' : 'GESCHLOSSEN'}${data.until ? ` (letzter Tag ${data.until})` : ''}`,
    `Meldung, wenn geschlossen: ${data.message || '(keine)'}`,
    `Schlüssel nötig: ${data.keys === false ? 'nein (jeder mit der exe kommt rein)' : 'ja'}`,
    `Tester (${testers.length}): ${testers.map((tester) => tester.name + (tester.until ? ` (bis ${tester.until})` : '')).join(', ') || 'keine'}`,
  ].join('\n')
}

function git(...args) {
  return execFileSync('git', args, { cwd: here, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
const gitError = (error) => String(error.stderr || error.message).trim().split('\n').slice(-3).join('\n')

// Holt den Stand von GitHub, ändert, speichert, committet und pusht.
function change(name, ...args) {
  if (!noGit) {
    try { git('pull', '--ff-only', '-q') } catch (error) {
      console.log(`Konnte den Stand von GitHub nicht holen, nichts geändert:\n${gitError(error)}`)
      return false
    }
  }
  const data = JSON.parse(readFileSync(FILE, 'utf8'))
  const result = actions[name](data, ...args)
  if (result.error) { console.log(result.error); return false }
  writeFileSync(FILE, format(data))
  if (result.key) {
    appendFileSync(KEYS, `${new Date().toISOString().slice(0, 10)}  ${args[0]}  ${result.key}${args[1] ? `  (bis ${args[1]})` : ''}\n`)
    console.log(`\nSchlüssel für ${String(args[0]).trim()} (an den Tester geben, steht auch in schluessel.txt):\n\n    ${result.key}\n`)
  }
  if (noGit) { console.log('(SOMA_NO_GIT: nur gespeichert)'); return true }
  try {
    git('add', 'access.json')
    git('commit', '-q', '-m', result.commit)
    git('push', '-q')
    console.log(`${result.commit}. Gepusht, wirkt in der Demo nach spätestens etwa 10 Minuten.`)
  } catch (error) {
    console.log(`Gespeichert, aber Git hat nicht geklappt:\n${gitError(error)}\nIn VS Code „Sync“ drücken oder später „git push“.`)
  }
  return true
}

async function online() {
  try {
    const response = await fetch(`${LIVE}?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
    if (!response.ok) return `Online: nicht gefunden (HTTP ${response.status})`
    const text = await response.text()
    try {
      const data = JSON.parse(text)
      return `Online (was die Demo gerade sieht, GitHub hält bis zu 5 Minuten zwischen):\n${describe(data)}`
    } catch { return 'Online: die Datei ist kein gültiges JSON, die Demo bleibt gesperrt!' }
  } catch (error) { return `Online: nicht erreichbar (${error.message})` }
}

async function status() {
  if (!noGit) { try { git('pull', '--ff-only', '-q') } catch { /* dann der Stand auf diesem Rechner */ } }
  console.log(`\nHier:\n${describe(JSON.parse(readFileSync(FILE, 'utf8')))}\n`)
  console.log(await online())
}

// Eingabe Zeile für Zeile; was vor der Frage schon getippt ist, geht nicht verloren. Am Ende der
// Eingabe ('' nach dem Schließen) endet das Menü.
function lines() {
  const reader = createInterface({ input: process.stdin, terminal: false })
  const ready = []
  const waiting = []
  let closed = false
  reader.on('line', (line) => (waiting.length ? waiting.shift()(line.trim()) : ready.push(line.trim())))
  reader.on('close', () => { closed = true; while (waiting.length) waiting.shift()(null) })
  return {
    question(prompt) {
      process.stdout.write(prompt)
      if (ready.length) return Promise.resolve(ready.shift())
      return closed ? Promise.resolve(null) : new Promise((resolve) => waiting.push(resolve))
    },
    close: () => reader.close(),
  }
}

async function menu() {
  const input = lines()
  const ask = { question: async (prompt) => (await input.question(prompt)) ?? '' }
  await status()
  for (;;) {
    console.log('\n  1  Playtest öffnen\n  2  Playtest schließen\n  3  Tester hinzufügen\n  4  Tester entfernen\n  5  Enddatum für alle\n  6  Stand (auch online)\n  0  Beenden')
    const choice = await input.question('\nWahl: ')
    if (choice === null || choice === '0') break
    if (choice === '') continue
    if (choice === '1') change('auf')
    else if (choice === '2') change('zu', (await ask.question('Meldung für die Tester (Enter = die bisherige): ')).trim())
    else if (choice === '3') change('neu', (await ask.question('Name (öffentlich lesbar, lieber Vorname oder Kürzel): ')).trim(), (await ask.question('Gültig bis (JJJJ-MM-TT, Enter = ohne Ende): ')).trim())
    else if (choice === '4') {
      const data = JSON.parse(readFileSync(FILE, 'utf8'))
      console.log(`Tester: ${(data.testers ?? []).map((tester) => tester.name).join(', ') || 'keine'}`)
      change('weg', (await ask.question('Welchen entfernen (Name): ')).trim())
    } else if (choice === '5') change('ende', (await ask.question('Letzter Tag für alle (JJJJ-MM-TT, - = ohne Ende): ')).trim())
    else if (choice === '6') await status()
    else console.log('Bitte 0 bis 6.')
  }
  input.close()
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [command, ...args] = process.argv.slice(2)
  if (!command) await menu()
  else if (command === 'stand') await status()
  else if (actions[command]) process.exitCode = change(command, ...args) ? 0 : 1
  else console.log('node steuern.mjs [stand | auf | zu "Meldung" | neu "Name" [JJJJ-MM-TT] | weg "Name" | ende JJJJ-MM-TT|-]')
}
