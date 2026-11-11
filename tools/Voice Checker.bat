@echo off
rem Starts the voice line checker and opens it in your normal browser.
rem Close the "Voice Checker server" window to stop it.
cd /d "%~dp0.."
start "Voice Checker server" python tools\voice-checker.py
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8810
