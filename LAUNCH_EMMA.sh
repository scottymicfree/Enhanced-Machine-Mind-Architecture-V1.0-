#!/usr/bin/env bash

# Universal wrapper to provide a unified single-click launch interface regardless of the host environment.
# This terminal UI directs the operator to initialize the correct isolation boundary.

clear
echo "=========================================================================="
echo "    E.M.M.A. UNIFIED COGNITIVE LAUNCHER (v1.0.0-PROD)                     "
echo "=========================================================================="
echo "  Deploying this orchestration matrix requires specifying the target node.  "
echo "  Select the module you wish to initialize on this physical machine:      "
echo "=========================================================================="
echo ""
echo "  [1] Linux Cognitive Edge Server (Daemon, eBPF, Ray, Ollama)"
echo "  [2] Windows Operator Dashboard (Tauri, React, WebGPU)"
echo "  [3] Browser Fallback Preview (Vite UI Dev Server)"
echo ""
echo "=========================================================================="
read -p "Select Target Node (1-3): " choice

case $choice in
  1)
    echo -e "\n[>>] Delegating to Linux Setup Pipeline..."
    cd scripts && sudo bash ./setup_edge_linux.sh
    ;;
  2)
    echo -e "\n[>>] Delegating to Windows PowerShell Pipeline..."
    cd scripts && pwsh ./start_emma_windows.ps1
    ;;
  3)
    echo -e "\n[>>] Booting Web Fallback React SPA..."
    npm run dev
    ;;
  *)
    echo -e "\n[!] Invalid selection. Aborting boot sequence."
    exit 1
    ;;
esac
