#!/usr/bin/env bash
# ============================================================
# Q-SCL — Full Stack Launcher
# Usage: ./run.sh
# ============================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT/q_scl_frontend"
VENV="$ROOT/venv/bin/python"
FRONTEND_URL="http://localhost:3000"
LOG_DIR="$ROOT/.logs"

# Colours
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

mkdir -p "$LOG_DIR"

step() { echo -e "\n${CYAN}▶  $1${RESET}"; }
ok()   { echo -e "${GREEN}✓  $1${RESET}"; }
warn() { echo -e "${YELLOW}⚠  $1${RESET}"; }
fail() { echo -e "${RED}✕  $1${RESET}"; exit 1; }

# ── 1. Check prerequisites ───────────────────────────────────
step "Checking prerequisites..."

command -v node  >/dev/null 2>&1 || fail "node not found — install Node.js"
command -v npm   >/dev/null 2>&1 || fail "npm not found"
[ -f "$VENV" ]                   || fail "Python venv not found at $VENV"
[ -f "$FRONTEND_DIR/package.json" ] || fail "Frontend not found at $FRONTEND_DIR"

ok "All prerequisites present"

# ── 2. Quantum Provider — one entropy rotation ─────────────
step "Running Quantum Entropy Provider (devnet)..."

PROVIDER_LOG="$LOG_DIR/quantum_provider.log"

"$VENV" "$ROOT/quantum_provider.py" --once 2>&1 | tee "$PROVIDER_LOG"

if grep -q "Entropy rotation COMPLETE" "$PROVIDER_LOG"; then
  ok "Quantum entropy rotation succeeded"
elif grep -q "Entropy rotation FAILED" "$PROVIDER_LOG"; then
  warn "Quantum provider failed (provider wallet may need SOL on Devnet)."
  warn "Fund: FcPSpYXRhxDs4jQTheYN27RGo5YwL8yCPoi4obF7Dn7x at https://faucet.solana.com"
  warn "Continuing anyway — frontend will use simulated state."
else
  warn "Quantum provider status unknown — continuing."
fi

# ── 3. Install frontend deps if needed ──────────────────────
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  step "Installing frontend dependencies..."
  npm --prefix "$FRONTEND_DIR" install
  ok "Dependencies installed"
else
  ok "Frontend dependencies already installed"
fi

# ── 4. Start Next.js dev server ─────────────────────────────
step "Starting Next.js frontend..."

FRONTEND_LOG="$LOG_DIR/frontend.log"

# Kill any previous instance on port 3000
if lsof -ti:3000 >/dev/null 2>&1; then
  warn "Port 3000 already in use — killing previous process..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

npm --prefix "$FRONTEND_DIR" run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID (logs: $FRONTEND_LOG)"

# ── 5. Wait for frontend to be ready ────────────────────────
step "Waiting for frontend to be ready..."

TIMEOUT=60
ELAPSED=0
until curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    fail "Frontend did not start within ${TIMEOUT}s. Check $FRONTEND_LOG"
  fi
  echo -n "."
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done
echo ""
ok "Frontend is live at $FRONTEND_URL"

# ── 6. Open browser ─────────────────────────────────────────
step "Opening browser..."

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$FRONTEND_URL" &
elif command -v firefox >/dev/null 2>&1; then
  firefox "$FRONTEND_URL" &
elif command -v google-chrome >/dev/null 2>&1; then
  google-chrome "$FRONTEND_URL" &
else
  warn "Could not detect browser — open manually: $FRONTEND_URL"
fi

# ── 7. Summary ───────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================================${RESET}"
echo -e "${GREEN}  Q-SCL is running!${RESET}"
echo -e "${GREEN}  Frontend : $FRONTEND_URL${RESET}"
echo -e "${GREEN}  Logs     : $LOG_DIR/${RESET}"
echo -e "${GREEN}============================================================${RESET}"
echo ""
echo "Press Ctrl+C to stop the frontend server."
echo ""

# Keep script alive so Ctrl+C kills the frontend cleanly
wait $FRONTEND_PID
