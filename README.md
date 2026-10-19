# SOMA Demo: Freigabe

Diese Datei entscheidet, ob die SOMA-Body-Lab-Demo startet (Q64). Sie liegt im **öffentlichen** GitHub-Repo
`TomKaetsch-lab/soma-demo-access` (Zweig `main`) als `access.json`. Die Demo fragt
`https://raw.githubusercontent.com/TomKaetsch-lab/soma-demo-access/main/access.json` beim Start und alle 5 Minuten ab.
Eine Änderung wirkt nach spätestens etwa 10 Minuten (GitHub hält die Datei bis zu 5 Minuten zwischen).

## Am einfachsten: „Freigabe steuern.bat“

Das Repo einmal klonen (VS Code: „Clone Repository“, oder `git clone https://github.com/TomKaetsch-lab/soma-demo-access`),
dann im Ordner **„Freigabe steuern.bat“** doppelklicken (braucht Node.js und Git). Sie zeigt den Stand, hier und
online, und ein Menü:

- **1 Playtest öffnen**, **2 Playtest schließen** (mit Meldung für die Tester, die auf dem Sperrbildschirm erscheint)
- **3 Tester hinzufügen:** Name und optional „gültig bis“; sie zeigt den neuen Schlüssel (`SOMA-XXXX-XXXX-XXXX-XXXX`),
  den gibst du dem Tester. Er steht außerdem in `schluessel.txt` in diesem Ordner, nur auf deinem Rechner (wird nie
  gepusht).
- **4 Tester entfernen:** sie zeigt die Tester mit Nummern; du gibst eine Nummer (`1`), mehrere (`1,3` oder `1-3`),
  Namen (Groß-/Kleinschreibung und Leerzeichen egal) oder `alle` ein und bestätigst mit `j`. Passt etwas nicht,
  ändert sie nichts und sagt es rot.
- **5 Enddatum für alle** (`-` = ohne Ende), **6 Stand**

Jede Änderung holt zuerst den Stand von GitHub, schreibt eine gültige `access.json`, committet und pusht sie und
liest danach nach, was auf GitHub angekommen ist: grün „Auf GitHub angekommen: …“, sonst rot, was nicht stimmt. Über
dem Menü steht immer der aktuelle Stand. „Stand“ zeigt, was auf GitHub liegt und was die Demos gerade sehen (GitHub
hält die Datei bis zu 5 Minuten zwischen). Ohne Menü geht es auch direkt: `node steuern.mjs zu "Pause bis Freitag."`,
`node steuern.mjs auf`, `node steuern.mjs neu "Lena" 2026-11-30`, `node steuern.mjs weg 1-3`,
`node steuern.mjs weg "Lena"`, `node steuern.mjs stand`.

## Was die Tester sehen

Auf dem Sperrbildschirm der Demo zeigt ein Live-Punkt, ob der Playtest gerade läuft (grün, mit dem letzten Tag) oder
geschlossen ist (rot); er fragt jede Minute neu. Schließt du, sperren sich laufende Demos (spätestens nach etwa
10 Minuten); öffnest du wieder, startet die Demo bei Testern mit gespeichertem Schlüssel von selbst. Ein falscher oder
unvollständiger Schlüssel lässt das Fenster wackeln und kurz rot werden.

## Von Hand (github.com oder VS Code)

Genauso gut: `access.json` direkt auf github.com ändern (Stift-Symbol, dann „Commit changes“, auch vom Handy) oder in
VS Code bearbeiten, committen und pushen.

- **Zu:** `"open": false`. Laufende Demos wechseln auf den Sperrbildschirm und zeigen `message`, neue starten nicht.
- **Auf:** `"open": true`. Wartende Demos mit gespeichertem Schlüssel starten beim nächsten Abruf von selbst (oder
  „Erneut prüfen“); der Schlüssel bleibt gespeichert.
- **Ende für alle an einem Tag:** `"until": "2026-12-31"` (letzter Tag, mitteleuropäische Zeit; weglassen = ohne
  Ende). Es zählt die Uhr von GitHub, nicht die des Testers.
- **Einen Tester sperren:** seine Zeile unter `"testers"` löschen (oder `"until"` auf einen vergangenen Tag).
- **Neuer Tester von Hand:** im Physics-Ordner `node scripts/demo-access.mjs key "Name" [JJJJ-MM-TT]`, die
  ausgegebene Zeile unter `"testers"` einfügen. (Mit der Bat geht das in einem Schritt.)

## Wichtig

- In der Datei steht je Tester nur der SHA-256 seines Schlüssels, nicht der Schlüssel selbst; die öffentliche Datei
  verrät also keinen. Die Namen sind öffentlich lesbar: lieber Vornamen oder Kürzel.
- Die Datei muss gültiges JSON sein (Komma zwischen den Einträgen, keins nach dem letzten, gerade Anführungszeichen).
  Die Bat schreibt sie immer gültig. Bei einem Fehler von Hand startet keine Demo neu („Freigabe nicht lesbar“),
  laufende spielen noch 30 Minuten weiter. Prüfen: Menüpunkt 6 oder `node steuern.mjs stand`.
- Ohne Internet startet die Demo nicht. Reißt die Verbindung im Spiel ab, läuft sie noch 30 Minuten.
- `"keys": false` hieße: jeder mit der exe kommt rein (nicht empfohlen).
- Das Repo muss öffentlich bleiben (die Demo fragt ohne Anmeldung). Es enthält keine Schlüssel und keinen Code der
  Demo, nur dieses kleine Steuer-Skript.
- Ganz verhindern lässt sich das Umgehen nicht: Wer die exe auspackt und ändert, kommt vorbei. Gegen das einfache
  Weitergeben der exe hilft es aber, und jeder Schlüssel lässt sich einzeln sperren.
