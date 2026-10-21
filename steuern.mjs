// Steuert die Freigabe der SOMA-Body-Lab-Demo (Q65): access.json in diesem Ordner, dem Repo
// soma-demo-access. Playtest öffnen und schließen, Tester hinzufügen und entfernen, Enddatum für alle,
// Stand ansehen; jede Änderung wird gleich committet und gepusht (die Demo liest die Datei auf GitHub).
//   Doppelklick auf „Freigabe steuern.bat“ (Menü), oder:
//   node steuern.mjs stand
//   node steuern.mjs auf
//   node steuern.mjs zu ["Meldung für die Tester"]
//   node steuern.mjs neu "Name" [JJJJ-MM-TT]
//   node steuern.mjs weg "Name" ["Name" …]   (oder Nummern aus der Liste: weg 1,3  weg 1-3  weg alle)
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
// Namen gelten als gleich ohne Groß- und Kleinschreibung und ohne Leerzeichen („tester1“ = „Tester 1“).
const nameKey = (name) => String(name ?? '').toLowerCase().replace(/\s+/g, '')
const sameName = (a, b) => nameKey(a) === nameKey(b)
const testersOf = (data) => (Array.isArray(data.testers) ? data.testers : [])

// Welche Tester eine Eingabe meint: Nummern der Liste (1 · 1,3 · 1 3 · 1-3), Namen (mit Komma getrennt) oder
// „alle“. Gibt die Namen, wie sie in der Datei stehen, und was nicht passte.
export function pick(testers, input) {
  const text = String(input ?? '').trim()
  if (!text) return { names: [], unknown: [] }
  if (/^alle$/i.test(text)) return { names: testers.map((tester) => tester.name), unknown: [] }
  const names = []
  const unknown = []
  const add = (name) => { if (!names.includes(name)) names.push(name) }
  if (/^[\d\s,;-]+$/.test(text)) {
    for (const part of text.split(/[\s,;]+/).filter(Boolean)) {
      const range = /^(\d+)(?:-(\d+))?$/.exec(part)
      const from = range ? Number(range[1]) : NaN
      const to = range ? Number(range[2] ?? range[1]) : NaN
      if (!(from >= 1 && to <= testers.length && from <= to)) { unknown.push(part); continue }
      for (let index = from; index <= to; index++) add(testers[index - 1].name)
    }
    return { names, unknown }
  }
  for (const part of text.split(/[,;]/).map((piece) => piece.trim()).filter(Boolean)) {
    const tester = testers.find((entry) => sameName(entry.name, part))
    if (tester) add(tester.name)
    else unknown.push(part)
  }
  return { names, unknown }
}

const listed = (data) => testersOf(data).map((tester) => tester.name).join(', ') || 'keine'
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
    if (/[,;]/.test(name) || /^[\d\s-]+$/.test(name) || /^alle$/i.test(name)) return { error: `Der Name „${name}“ geht nicht (keine Kommas, nicht nur Ziffern, nicht „alle“).` }
    if (until && !isDay(until)) return { error: `Kein Datum: ${until} (so: 2026-11-30)` }
    data.testers = testersOf(data)
    if (data.testers.some((tester) => sameName(tester.name, name))) return { error: `Es gibt schon einen Tester „${name}“.` }
    const key = newKey()
    data.testers.push({ name, key: hashKey(key), ...(until ? { until } : {}) })
    return { commit: `Tester ${name} hinzugefügt`, key }
  },
  // Einer oder mehrere, als Namen oder Nummern (siehe pick); passt etwas nicht, wird nichts entfernt.
  weg(data, ...inputs) {
    const testers = testersOf(data)
    const { names, unknown } = pick(testers, inputs.join(', '))
    if (unknown.length) return { error: `Nicht gefunden: ${unknown.join(', ')}. Da sind: ${listed(data)}` }
    if (!names.length) return { error: `Bitte angeben, welche Tester (Nummer oder Name). Da sind: ${listed(data)}` }
    data.testers = testers.filter((tester) => !names.includes(tester.name))
    return { commit: `Tester ${names.join(', ')} entfernt`, removed: names }
  },
  // Öffentlich (Q114, itch.io): jeder startet die Demo ohne Schlüssel, ohne Internet spielt sie
  // weiter, „zu“ schaltet sie trotzdem für alle ab. Nur Tester: wieder mit Schlüssel.
  oeffentlich(data) {
    if (data.keys === false) return { error: 'Die Demo ist schon öffentlich.' }
    data.keys = false
    return { commit: 'Demo öffentlich (ohne Schlüssel)' }
  },
  tester(data) {
    if (data.keys !== false) return { error: 'Die Demo braucht schon Schlüssel.' }
    data.keys = true
    return { commit: 'Demo nur mit Tester-Schlüssel' }
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
  const testers = testersOf(data)
  return [
    `  Playtest: ${data.open === true ? 'OFFEN' : 'GESCHLOSSEN'}${data.until ? ` (letzter Tag ${data.until})` : ''}`,
    `  Meldung, wenn geschlossen: ${data.message || '(keine)'}`,
    `  Schlüssel nötig: ${data.keys === false ? 'nein (öffentlich: jeder spielt, auch ohne Internet; „zu“ schaltet ab)' : 'ja'}`,
    `  Tester (${testers.length}): ${testers.map((tester) => tester.name + (tester.until ? ` (bis ${tester.until})` : '')).join(', ') || 'keine'}`,
  ].join('\n')
}
const short = (data) => `${data.open === true ? 'OFFEN' : 'GESCHLOSSEN'}${data.until ? ` bis ${data.until}` : ''} · ${data.keys === false ? 'ÖFFENTLICH (ohne Schlüssel)' : `${testersOf(data).length} Tester: ${listed(data)}`}`

// Farbe nur im Konsolenfenster (Windows 10 und neuer können das).
const tty = Boolean(process.stdout.isTTY)
const paint = (code) => (text) => (tty ? `\x1b[${code}m${text}\x1b[0m` : text)
const red = paint('91')
const green = paint('92')
const bold = paint('1')

function git(...args) {
  return execFileSync('git', args, { cwd: here, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
const gitError = (error) => String(error.stderr || error.message).trim().split('\n').slice(-3).join('\n')
const pull = () => git('pull', '--ff-only', '-q')
// Was gerade wirklich auf GitHub liegt (nach einem fetch), oder null.
function onGitHub() {
  try {
    git('fetch', '-q')
    return JSON.parse(git('show', '@{u}:access.json'))
  } catch { return null }
}
const readLocal = () => JSON.parse(readFileSync(FILE, 'utf8'))

// Holt den Stand von GitHub, ändert, speichert, committet, pusht und prüft, was auf GitHub angekommen ist.
function change(name, ...args) {
  if (!noGit) {
    try { pull() } catch (error) {
      console.log(red(`\nNICHTS GEÄNDERT: Konnte den Stand von GitHub nicht holen:\n${gitError(error)}`))
      return false
    }
  }
  const data = readLocal()
  const result = actions[name](data, ...args)
  if (result.error) { console.log(red(`\nNICHTS GEÄNDERT: ${result.error}`)); return false }
  writeFileSync(FILE, format(data))
  if (result.key) {
    appendFileSync(KEYS, `${new Date().toISOString().slice(0, 10)}  ${args[0]}  ${result.key}${args[1] ? `  (bis ${args[1]})` : ''}\n`)
    console.log(`\nSchlüssel für ${String(args[0]).trim()} (an den Tester geben, steht auch in schluessel.txt):\n\n    ${bold(result.key)}\n`)
  }
  if (noGit) { console.log('(SOMA_NO_GIT: nur gespeichert)'); return true }
  try {
    git('add', 'access.json')
    git('commit', '-q', '-m', result.commit)
    git('push', '-q')
  } catch (error) {
    console.log(red(`\nNUR AUF DIESEM RECHNER GESPEICHERT, nicht auf GitHub:\n${gitError(error)}\nIn VS Code „Sync“ drücken oder später „git push“.`))
    return false
  }
  // Nachsehen, ob es wirklich drüben ist (verglichen mit der Datei, wie sie geschrieben wurde).
  const written = JSON.parse(format(data))
  const remote = onGitHub()
  const still = (result.removed ?? []).filter((removed) => testersOf(remote ?? {}).some((tester) => tester.name === removed))
  if (!remote) console.log(`${result.commit}. Gepusht, aber der Stand auf GitHub ließ sich nicht nachlesen.`)
  else if (still.length || JSON.stringify(remote) !== JSON.stringify(written)) console.log(red(`\nACHTUNG: Auf GitHub steht etwas anderes${still.length ? ` (noch drin: ${still.join(', ')})` : ''}:\n${describe(remote)}`))
  else console.log(green(`\n${result.commit}. Auf GitHub angekommen: ${short(remote)}`) + '\nDie Demos sehen es nach spätestens etwa 10 Minuten.')
  return true
}

async function online() {
  try {
    const response = await fetch(`${LIVE}?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
    if (!response.ok) return { message: `nicht gefunden (HTTP ${response.status})` }
    const text = await response.text()
    try { return { data: JSON.parse(text) } } catch { return { message: red('die Datei ist kein gültiges JSON, die Demo bleibt gesperrt!') } }
  } catch (error) { return { message: `nicht erreichbar (${error.message})` } }
}

async function status() {
  let remote = null
  if (!noGit) {
    try { pull() } catch (error) { console.log(red(`Konnte den Stand von GitHub nicht holen:\n${gitError(error)}`)) }
    remote = onGitHub()
  }
  const local = readLocal()
  if (remote) console.log(`\n${bold('Auf GitHub:')}\n${describe(remote)}`)
  if (!remote || JSON.stringify(remote) !== JSON.stringify(local)) console.log(`\n${bold(remote ? 'Auf diesem Rechner (anders als auf GitHub, nicht gepusht?):' : 'Auf diesem Rechner:')}\n${describe(local)}`)
  const live = await online()
  if (!live.data) console.log(`\n${bold('Was die Demos sehen:')} ${live.message}`)
  else if (JSON.stringify(live.data) === JSON.stringify(remote ?? local)) console.log(`\n${bold('Was die Demos sehen:')} dasselbe.`)
  else console.log(`\n${bold('Was die Demos gerade sehen')} (GitHub hält die Datei bis zu 5 Minuten zwischen, das kommt gleich nach):\n${describe(live.data)}`)
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

async function removeTesters(ask) {
  if (!noGit) { try { pull() } catch { /* change() meldet es */ } }
  const testers = testersOf(readLocal())
  if (!testers.length) { console.log('Es gibt keine Tester.'); return }
  console.log('')
  testers.forEach((tester, index) => console.log(`  ${index + 1}  ${tester.name}${tester.until ? ` (bis ${tester.until})` : ''}`))
  const { names, unknown } = pick(testers, await ask.question('\nWelche entfernen? Nummer (1), mehrere (1,3 oder 1-3), Name oder „alle“: '))
  if (unknown.length) { console.log(red(`\nNICHTS GEÄNDERT: nicht gefunden: ${unknown.join(', ')}`)); return }
  if (!names.length) { console.log('Nichts ausgewählt.'); return }
  if (!/^j/i.test(await ask.question(`${names.join(', ')} entfernen? (j/n): `))) { console.log('Abgebrochen, nichts geändert.'); return }
  change('weg', names.join(', '))
}

async function menu() {
  const input = lines()
  const ask = { question: async (prompt) => (await input.question(prompt)) ?? '' }
  await status()
  for (;;) {
    console.log(`\n${bold('Stand:')} ${short(readLocal())}`)
    console.log('  1  Demo öffnen\n  2  Demo schließen (für alle, mit Meldung)\n  3  Tester hinzufügen\n  4  Tester entfernen\n  5  Enddatum für alle\n  6  Stand (auch was die Demos sehen)\n  7  Öffentlich: jeder spielt ohne Schlüssel (itch.io)\n  8  Nur Tester: mit Schlüssel\n  0  Beenden')
    const choice = await input.question('\nWahl: ')
    if (choice === null || choice === '0') break
    if (choice === '') continue
    if (choice === '1') change('auf')
    else if (choice === '2') change('zu', (await ask.question('Meldung für die Tester (Enter = die bisherige): ')).trim())
    else if (choice === '3') change('neu', (await ask.question('Name (öffentlich lesbar, lieber Vorname oder Kürzel): ')).trim(), (await ask.question('Gültig bis (JJJJ-MM-TT, Enter = ohne Ende): ')).trim())
    else if (choice === '4') await removeTesters(ask)
    else if (choice === '5') change('ende', (await ask.question('Letzter Tag für alle (JJJJ-MM-TT, - = ohne Ende): ')).trim())
    else if (choice === '6') await status()
    else if (choice === '7') change('oeffentlich')
    else if (choice === '8') change('tester')
    else console.log('Bitte 0 bis 8.')
  }
  input.close()
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [command, ...args] = process.argv.slice(2)
  if (!command) await menu()
  else if (command === 'stand') await status()
  else if (actions[command]) process.exitCode = change(command, ...args) ? 0 : 1
  else console.log('node steuern.mjs [stand | auf | zu "Meldung" | oeffentlich | tester | neu "Name" [JJJJ-MM-TT] | weg "Name" … | weg 1,3 | ende JJJJ-MM-TT|-]')
}
