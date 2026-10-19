# SOMA Demo: Freigabe

Diese Datei entscheidet, ob die SOMA-Body-Lab-Demo startet (Q64). Sie gehört in ein **öffentliches** GitHub-Repo
`TomKaetsch-lab/soma-demo-access` (Zweig `main`), dort als `access.json` und diese Anleitung als `README.md`. Die
Demo fragt `https://raw.githubusercontent.com/TomKaetsch-lab/soma-demo-access/main/access.json` beim Start und alle
5 Minuten ab. Eine Änderung wirkt nach spätestens etwa 10 Minuten (GitHub hält die Datei bis zu 5 Minuten zwischen).
Ändern geht direkt auf github.com (Stift-Symbol an der Datei, dann „Commit changes“), auch vom Handy.

## Playtest zu und auf

- **Zu:** `"open": false`. Laufende Demos wechseln auf den Sperrbildschirm und zeigen `message`, neue starten nicht.
- **Auf:** `"open": true`. Die Tester klicken „Erneut prüfen“ (oder starten neu); der Schlüssel bleibt gespeichert.
- **Ende für alle an einem Tag:** `"until": "2026-12-31"` dazuschreiben (letzter Tag, mitteleuropäische Zeit).
  Weglassen heißt ohne Ende. Es zählt die Uhr von GitHub, nicht die des Testers.

## Tester

- Jeder Tester hat einen eigenen Schlüssel (`SOMA-XXXX-XXXX-XXXX-XXXX`), den er beim ersten Start eingibt. In der
  Datei steht nur sein SHA-256, nicht der Schlüssel selbst; die öffentliche Datei verrät also keinen Schlüssel.
- **Neuer Tester:** im Physics-Ordner „SOMA Demo Tester-Schluessel.bat“ (oder
  `node scripts/demo-access.mjs key "Name" [JJJJ-MM-TT]`). Die ausgegebene Zeile unter `"testers"` einfügen, den
  Schlüssel dem Tester geben. Mit Datum gilt der Schlüssel bis zu diesem Tag.
- **Einen Tester sperren:** seine Zeile löschen (oder `"until"` auf einen vergangenen Tag setzen).
- Die Namen sind öffentlich lesbar: lieber Vornamen oder Kürzel.
- Ohne Schlüssel für alle: `"keys": false` (nicht empfohlen: dann reicht die exe allein).

## Wichtig

- Die Datei muss gültiges JSON sein: Komma zwischen den Einträgen, keins nach dem letzten, gerade Anführungszeichen.
  Bei einem Fehler startet keine Demo neu („Freigabe nicht lesbar“), laufende spielen noch 30 Minuten weiter.
  Prüfen: `node scripts/demo-access.mjs check` (mit einem Schlüssel dahinter: was dieser Tester sieht).
- Ohne Internet startet die Demo nicht. Reißt die Verbindung im Spiel ab, läuft sie noch 30 Minuten.
- Das Repo muss öffentlich bleiben (die Demo fragt ohne Anmeldung). Es enthält keinen Code und keine Schlüssel.
- Ganz verhindern lässt sich das Umgehen nicht: Wer die exe auspackt und ändert, kommt vorbei. Gegen das einfache
  Weitergeben der exe hilft es aber, und jeder Schlüssel lässt sich einzeln sperren.
