@echo off
rem Freigabe der SOMA-Demo steuern (Q65): Playtest auf und zu, Tester hinzufuegen und entfernen,
rem Enddatum, Stand. Jede Aenderung wird gleich committet und gepusht. Voraussetzung: Node.js und Git.
rem Node und Git werden auch gefunden, wenn sie nicht im PATH stehen (nvm fuer Windows, Installer).
setlocal
cd /d "%~dp0"

set "NODE="
for /f "delims=" %%N in ('where node 2^>nul') do call :try_node "%%N"
call :try_node "%NVM_SYMLINK%\node.exe"
call :try_node "C:\nvm4w\nodejs\node.exe"
call :try_node "%ProgramFiles%\nodejs\node.exe"
call :try_node "%LOCALAPPDATA%\Programs\nodejs\node.exe"
if defined NVM_HOME for /f "delims=" %%D in ('dir /b /ad /o-n "%NVM_HOME%\v*" 2^>nul') do call :try_node "%NVM_HOME%\%%D\node.exe"
for /f "delims=" %%D in ('dir /b /ad /o-n "%LOCALAPPDATA%\nvm\v*" 2^>nul') do call :try_node "%LOCALAPPDATA%\nvm\%%D\node.exe"
for /f "delims=" %%D in ('dir /b /ad /o-n "%APPDATA%\nvm\v*" 2^>nul') do call :try_node "%APPDATA%\nvm\%%D\node.exe"
if not defined NODE goto no_node

set "GIT="
for /f "delims=" %%G in ('where git 2^>nul') do call :try_git "%%G"
call :try_git "%ProgramFiles%\Git\cmd\git.exe"
call :try_git "%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
call :try_git "%ProgramW6432%\Git\cmd\git.exe"
if not defined GIT goto no_git

rem Beide vorn in den PATH, damit steuern.mjs sie findet (git ruft es selbst auf).
for %%F in ("%NODE%") do set "PATH=%%~dpF;%PATH%"
for %%F in ("%GIT%") do set "PATH=%%~dpF;%PATH%"
chcp 65001 >nul
echo Node: %NODE%
echo Git:  %GIT%
"%NODE%" steuern.mjs %*
pause
exit /b 0

:no_node
echo Node.js nicht gefunden. Gesucht im PATH, in NVM_SYMLINK, C:\nvm4w\nodejs, Programme\nodejs
echo und in den Versionen von nvm. Mit nvm in einer Eingabeaufforderung "nvm list" ansehen und eine
echo Version aktivieren, etwa "nvm use 22" - das braucht oft Administratorrechte. Sonst https://nodejs.org
pause
exit /b 1

:no_git
echo Git nicht gefunden. Gesucht im PATH und in Programme\Git. Bitte Git fuer Windows installieren:
echo https://git-scm.com - danach diese Datei noch einmal starten.
pause
exit /b 1

rem Nimmt den ersten Kandidaten, der existiert und wirklich startet (bei nvm die neueste Version).
:try_node
if defined NODE exit /b 0
if not exist "%~1" exit /b 0
"%~1" -v >nul 2>nul
if errorlevel 1 exit /b 0
set "NODE=%~1"
exit /b 0

:try_git
if defined GIT exit /b 0
if not exist "%~1" exit /b 0
"%~1" --version >nul 2>nul
if errorlevel 1 exit /b 0
set "GIT=%~1"
exit /b 0
