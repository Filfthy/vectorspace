@echo off
rem Starts the voice line checker and opens it in your normal browser.
rem Works from anywhere (a copy on the desktop too): the paths are absolute.
rem Close the "Voice Checker server" window to stop it.
set "VS=D:\CodeGen\vectorspace"
if not exist "%VS%\tools\voice-checker.py" (
  echo Cannot find %VS%\tools\voice-checker.py
  pause
  exit /b 1
)
start "Voice Checker server" /d "%VS%" cmd /k python "%VS%\tools\voice-checker.py"
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8810
