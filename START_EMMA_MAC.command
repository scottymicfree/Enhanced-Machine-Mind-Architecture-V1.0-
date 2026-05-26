#!/usr/bin/env bash
cd "$(dirname "$0")"
clear
echo "=================================================="
echo "  E.M.M.A. SYSTEM DASHBOARD - INITIALIZATION"
echo "=================================================="
echo ""
echo "[1/2] Installing Node.js Dependencies..."
npm install
echo ""
echo "[2/2] Booting Desktop Framework and Server..."
npm run dev
