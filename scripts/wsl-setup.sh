#!/bin/bash
# ============================================================
# Polaris WSL 环境安装脚本
# 适用于: Ubuntu 24.04 (WSL2)
# 目标: 配置 Tauri 2.0 开发环境
# ============================================================
set -e

echo "========================================="
echo " Polaris WSL 环境配置脚本"
echo "========================================="
echo ""

# ----------------------------------------------------------
# 第 1 步: 安装系统依赖
# ----------------------------------------------------------
echo ">>> [1/4] 安装系统依赖 (需要 sudo 权限)..."
echo ""

sudo apt update

sudo apt install -y \
  build-essential \
  pkg-config \
  libssl-dev \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libjavascriptcoregtk-4.1-dev \
  libsoup-3.0-dev \
  curl \
  file \
  wget \
  xdg-utils

echo ""
echo "[1/4] 系统依赖安装完成 ✓"
echo ""

# ----------------------------------------------------------
# 第 2 步: 安装 rustup (Rust 工具链管理器)
# ----------------------------------------------------------
echo ">>> [2/4] 安装 rustup + 最新稳定版 Rust..."
echo ""

# 如果已经有 rustup 就跳过
if command -v rustup &>/dev/null; then
  echo "rustup 已安装，更新到最新版本..."
  rustup update stable
else
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi

# 确认版本
RUST_VERSION=$(rustc --version)
echo ""
echo "Rust 版本: $RUST_VERSION"
echo "[2/4] Rust 安装完成 ✓"
echo ""

# ----------------------------------------------------------
# 第 3 步: 安装 nvm + Node.js v20
# ----------------------------------------------------------
echo ">>> [3/4] 安装 nvm + Node.js v20..."
echo ""

# 安装 nvm（如果没有）
export NVM_DIR="$HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi

# 加载 nvm
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 安装 Node.js v20
nvm install 20
nvm use 20
nvm alias default 20

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo ""
echo "Node.js 版本: $NODE_VERSION"
echo "npm 版本: $NPM_VERSION"
echo "[3/4] Node.js 安装完成 ✓"
echo ""

# ----------------------------------------------------------
# 第 4 步: 提示下一步操作
# ----------------------------------------------------------
echo "========================================="
echo " 环境配置完成！"
echo "========================================="
echo ""
echo "接下来请在 WSL 终端中执行以下命令："
echo ""
echo "  # 进入项目目录"
echo "  cd /mnt/d/space/base/Polaris"
echo ""
echo "  # 安装前端依赖"
echo "  npm install"
echo ""
echo "  # 启动 Tauri 开发模式"
echo "  npm run tauri dev"
echo ""
echo "========================================="
echo ""
echo "注意事项："
echo "  - 如果 sudo 需要密码，脚本会在第 1 步暂停等待输入"
echo "  - 首次 cargo build 会下载依赖并编译，可能需要 10-20 分钟"
echo "  - 如果遇到 cargo 找不到，运行: source ~/.cargo/env"
echo "  - 如果遇到 nvm 找不到，运行: source ~/.nvm/nvm.sh"
echo ""
