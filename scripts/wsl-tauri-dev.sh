#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"
nvm use 24
cd /home/qusc/Polaris
node --version
rustc --version
echo "Building MCP binaries..."
cargo build --manifest-path src-tauri/Cargo.toml --release --bin polaris-todo-mcp --bin polaris-requirements-mcp --bin polaris-scheduler-mcp
echo "Starting tauri dev..."
npm run tauri dev
