#!/usr/bin/env bash
# E.M.M.A. Master Provisioning & Single-Click Startup - Linux Edge Node
# This script bundles network bridging, docker-compose orchestration, and protocol compilation.

set -eo pipefail

echo "======================================================================"
echo "      E.M.M.A. LINUX EDGE COGNITIVE NODE - SINGLE CLICK SETUP        "
echo "======================================================================"

# 1. Privilege Validation
if [ "$EUID" -ne 0 ]; then
  echo "[FATAL] Aegis Active Defense requires kernel privileges. Run with sudo:"
  echo "        sudo ./setup_edge_linux.sh"
  exit 1
fi

# 2. Hardware & Network TAP Initialization
echo -e "\n[1/6] Initializing Hardware network taps and KVM bridges..."
if [ -f "./init_aegis_hardware.sh" ]; then
    bash ./init_aegis_hardware.sh
else
    echo "[WARN] init_aegis_hardware.sh not found in current directory. Skipping TAP config."
fi

# 3. Distributed Infrastructure (Docker Compose)
echo -e "\n[2/6] Spinning up Distributed Infrastructure (Weaviate, Redis, Ollama, Ray)..."
if command -v docker-compose &>/dev/null; then
    docker-compose -f ../docker-compose.yml up -d
else
    echo "[FATAL] docker-compose not found. Please install Docker."
    exit 1
fi

# 4. Pull Local Edge LLM (Llama 3)
echo -e "\n[3/6] Pulling local Llama-3 structural models..."
docker exec -it emma-ollama-1 ollama pull llama3:8b-instruct-q8_0 || {
    echo "[WARN] Could not automatically pull Llama 3 model. Ensure Ollama container is healthy."
}

# 5. Compile Protocols & eBPF CO-RE
echo -e "\n[4/6] Compiling Master Protocols and libbpf CO-RE Objects..."
if [ -f "./compile_protos.sh" ]; then
    bash ./compile_protos.sh
else
    echo "[WARN] compile_protos.sh not found. Skipping GRPC & CO-RE compilation."
fi

# 6. Install Edge Python Dependencies
echo -e "\n[5/6] Installing kernel_scheduler Python dependencies..."
if command -v pip3 &>/dev/null; then
    pip3 install -r ../requirements.txt || echo "[WARN] Dependency installation hit an error."
fi

# 7. Systemd Service Deployment
echo -e "\n[6/6] Deploying systemd emma-aegis background daemon..."
if [ -d "/etc/systemd/system/" ] && [ -f "../systemd/emma-aegis.service" ]; then
    cp ../systemd/emma-aegis.service /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable emma-aegis.service
    systemctl start emma-aegis.service
    echo "[INFO] emma-aegis.service started successfully."
else
    echo "[WARN] Systemd service configuration not found. Skipping daemonization."
fi

echo "======================================================================"
echo " [SUCCESS] E.M.M.A. Edge Node is now Active and Arming Perimeter.     "
echo "======================================================================"
