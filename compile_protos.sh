#!/usr/bin/env bash
# compile_protos.sh
# Universal shell compilation script to construct bindings across execution runtime boundaries

set -eo pipefail

echo "[PROTOC] Beginning E.M.M.A. Master Schema Compilation..."

# 1. Compile Python bindings on the Linux Edge
if command -v python3 &>/dev/null; then
  echo "[PROTOC] Generating Python protobuf models..."
  python3 -m pip install -q grpcio-tools
  python3 -m grpc_tools.protoc \
    -I=./proto \
    --python_out=./edge_runtime \
    --grpc_python_out=./edge_runtime \
    ./proto/telemetry.proto
  echo "[PROTOC] Python compilation verified."
else
  echo "[WARN] Python3 not found. Skipping edge compilation."
fi

# 2. Check for local Rust Tauri project file structure
if [ -d "./src-tauri" ]; then
  echo "[PROTOC] Rust bindings will be built dynamically via build.rs upon running cargo build."
fi

echo "[PROTOC] Master protocol synchronization complete."
