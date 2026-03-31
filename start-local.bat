@echo off
cd /d "%~dp0"
echo Launching SmritiCare on http://127.0.0.1:3000
echo A separate server window will open. Keep that window open while using the app.

start "SmritiCare Server" cmd /k "cd /d ""%~dp0"" && node server.js"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$deadline = (Get-Date).AddSeconds(30); " ^
  "do { " ^
  "  try { " ^
  "    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing -TimeoutSec 2; " ^
  "    if ($response.StatusCode -eq 200) { Start-Process 'http://127.0.0.1:3000/auth/login'; exit 0 } " ^
  "  } catch { } " ^
  "  Start-Sleep -Milliseconds 750; " ^
  "} while ((Get-Date) -lt $deadline); " ^
  "Write-Host ''; " ^
  "Write-Host 'SmritiCare did not become reachable on port 3000.'; " ^
  "Write-Host 'Please check the ""SmritiCare Server"" window for any error message.'; " ^
  "exit 1"

if errorlevel 1 (
  echo.
  pause
)
