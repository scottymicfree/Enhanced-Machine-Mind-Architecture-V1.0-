# start_emma.ps1
# Windows Host Orchestration Script for E.M.M.A. Dashboard

Write-Host "Starting E.M.M.A. Optical Bridge (MediaPipe Tracking)..."
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "optical_bridge\gaze_tracker.py"

Write-Host "Starting E.M.M.A. Tauri Dashboard..."
Start-Process -FilePath "src-tauri\target\release\emma-dashboard.exe"

Write-Host "E.M.M.A. system launched successfully. Close the console when done."
