#!/usr/bin/env bash
set -euo pipefail

# ST-CoC Platform 一键部署脚本
# 用法: ./setup.sh [SillyTavern 安装路径]
# 默认: ~/SillyTavern

ST_DIR="${1:-$HOME/SillyTavern}"

if [ ! -d "$ST_DIR" ]; then
    echo "错误: SillyTavern 目录不存在: $ST_DIR"
    echo "用法: ./setup.sh /path/to/SillyTavern"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "ST-CoC Platform 部署"
echo "  源目录: $SCRIPT_DIR"
echo "  目标:   $ST_DIR"
echo ""

# 1. 部署服务端插件
echo "[1/3] 部署插件 → $ST_DIR/plugins/coc-rules-engine/"
rm -rf "$ST_DIR/plugins/coc-rules-engine"
cp -r "$SCRIPT_DIR/plugins/coc-rules-engine" "$ST_DIR/plugins/"
echo "       ✅ 插件已部署"

# 2. 部署前端
echo "[2/3] 部署前端 → $ST_DIR/public/"
cp "$SCRIPT_DIR/st-coc-ui/index.html" "$ST_DIR/public/st-coc-ui.html"
mkdir -p "$ST_DIR/public/st-coc-ui/modules"
cp "$SCRIPT_DIR/st-coc-ui/modules/"*.json "$ST_DIR/public/st-coc-ui/modules/" 2>/dev/null || true
echo "       ✅ 前端已部署"

# 3. 部署扩展
echo "[3/3] 部署扩展 → $ST_DIR/extensions/third-party/"
for ext in coc-character-sheet coc-combat-panel coc-dice-panel coc-theme; do
    if [ -d "$SCRIPT_DIR/extensions/$ext" ]; then
        rm -rf "$ST_DIR/extensions/third-party/$ext"
        cp -r "$SCRIPT_DIR/extensions/$ext" "$ST_DIR/extensions/third-party/"
    fi
done
echo "       ✅ 扩展已部署"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  部署完成！"
echo ""
echo "  下一步:"
echo "  1. 重启 SillyTavern"
echo "  2. 打开 http://localhost:8000/st-coc-ui.html"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
