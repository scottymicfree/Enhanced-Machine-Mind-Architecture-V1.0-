#!/usr/bin/env bash
# compile_protos.sh
# Universal shell compilation script to construct bindings and compile eBPF CO-RE targets

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

# 3. Compile BPF CO-RE Target Object
if command -v clang &>/dev/null && [ -f "./edge_runtime/parallel_door.c" ]; then
  echo "[CO-RE] Pre-compiling parallel_door.bpf.o target ELF with Clang..."
  mkdir -p /opt/emma/bpf/
  clang -O2 -target bpf -D__TARGET_ARCH_x86 -g \
    -c ./edge_runtime/parallel_door.c \
    -o /opt/emma/bpf/parallel_door.bpf.o
  echo "[CO-RE] Compilation complete. ELF deployed to /opt/emma/bpf/parallel_door.bpf.o"
else
  echo "[INFO] Clang not found or source absent. Skipping pre-compiled CO-RE build (falling back to JIT BCC)."
fi

echo "[PROTOC] Master protocol synchronization complete."
