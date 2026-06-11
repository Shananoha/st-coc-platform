#!/bin/bash
set -e

ST_DIR="${1:-$HOME/apps/SillyTavern}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$ST_DIR" ]; then
    echo "❌ SillyTavern not found at $ST_DIR"
    echo "Usage: ./deploy.sh /path/to/SillyTavern"
    exit 1
fi

echo "📦 Deploying ST-CoC to $ST_DIR..."

# 1. Copy backend plugin
cp -r "$SCRIPT_DIR/plugins/coc-rules-engine" "$ST_DIR/plugins/"
echo "  ✅ Backend plugin"

# 2. Copy frontend
cp "$SCRIPT_DIR/st-coc-ui/index.html" "$ST_DIR/public/st-coc-ui.html"
echo "  ✅ Frontend"

# 3. Copy modules
mkdir -p "$ST_DIR/data/coc/modules"
if [ -f "$SCRIPT_DIR/data/coc/modules/default.json" ]; then
    cp "$SCRIPT_DIR/data/coc/modules/default.json" "$ST_DIR/data/coc/modules/default.json"
    echo "  ✅ Default module"
fi

# 4. Restart ST server
echo "🔄 Restarting SillyTavern..."
ST_PID=$(pgrep -f "node server" 2>/dev/null || true)
if [ -n "$ST_PID" ]; then
    kill -TERM "$ST_PID" 2>/dev/null || true
    sleep 2
fi

# 5. Start ST from its own directory (critical: workdir must be ST_DIR)
cd "$ST_DIR"
if command -v node &>/dev/null; then
    nohup node server.js --listen > /tmp/st-coc.log 2>&1 &
    sleep 4
    if pgrep -f "node server" > /dev/null; then
        echo "  ✅ Server restarted on :8000"
    else
        echo "  ⚠️  Server may have failed to start. Check /tmp/st-coc.log"
    fi
else
    echo "  ⚠️  node not found in PATH. Start ST manually with: cd $ST_DIR && node server.js --listen"
fi

echo "🎲 Done! Open http://localhost:8000/st-coc-ui.html"
