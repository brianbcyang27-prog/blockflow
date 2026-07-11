#!/bin/bash
# BlockFlow — Start Development Environment
# Launches the web server + API proxy simultaneously

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cleanup() {
    echo ""
    echo "Stopping BlockFlow services..."
    [ -n "$PROXY_PID" ] && kill "$PROXY_PID" 2>/dev/null
    [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
    echo "Done."
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "╔══════════════════════════════╗"
echo "║      BlockFlow — 3-Block Day ║"
echo "╚══════════════════════════════╝"
echo ""

# Kill stale processes
pkill -f "python3 -m http.server 8000" 2>/dev/null || true
pkill -f "api-proxy.py" 2>/dev/null || true
sleep 0.5

# Start API proxy (root-level version supports GET/POST/OPTIONS)
cd "$SCRIPT_DIR"
python3 api-proxy.py 8080 &
PROXY_PID=$!
echo "  [✓] API Proxy  → http://127.0.0.1:8080  (PID $PROXY_PID)"

# Start web server
cd "$SCRIPT_DIR/web"
python3 -m http.server 8000 &
SERVER_PID=$!
echo "  [✓] Web Server → http://localhost:8000  (PID $SERVER_PID)"

echo ""
echo "  ┌──────────────────────────────────┐"
echo "  │  Open http://localhost:8000       │"
echo "  │  Settings → http://localhost:8000/settings.html │"
echo "  │  Calendar → http://localhost:8000/calendar.html │"
echo "  └──────────────────────────────────┘"
echo ""
echo "  Press Ctrl+C to stop everything."
echo ""

wait
