@echo off
rem Freigabe der SOMA-Demo steuern (Q65): Playtest auf und zu, Tester hinzufuegen und entfernen,
rem Enddatum, Stand. Jede Aenderung wird gleich committet und gepusht. Voraussetzung: Node.js und Git.
chcp 65001 >nul
cd /d "%~dp0"
where node >/dev/null 2>/dev/null || (echo Node.js fehlt: bitte von https://nodejs.org installieren. & pause & exit /b 1)
where git >/dev/null 2>/dev/null || (echo Git fehlt: bitte von https://git-scm.com installieren. & pause & exit /b 1)
node steuern.mjs %*
pause
