@echo off
REM Launches Vite dev server with a scoped ExecutionPolicy bypass
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; npm run dev %*"
