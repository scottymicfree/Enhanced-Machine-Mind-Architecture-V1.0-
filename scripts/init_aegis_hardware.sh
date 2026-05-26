#!/usr/bin/env bash
# init_aegis_hardware.sh
# Pre-flight hardware network setup for bare-metal Firecracker & KVM orchestration

set -eo pipefail

echo "[AEGIS-INIT] Running pre-flight system checks..."

# 1. KVM Verification
if [ ! -e /dev/kvm ]; then
    echo "[FATAL] /dev/kvm not found! Nested hardware virtualization must be enabled on the host."
    exit 1
fi

if [ ! -r /dev/kvm ] || [ ! -w /dev/kvm ]; then
    echo "[INFO] Adjusting permissions on /dev/kvm to permit standard execution mapping..."
    sudo chmod 666 /dev/kvm
fi

echo "[AEGIS-INIT] KVM Hypervisor checked: SUCCESS."

# 2. Firecracker network TAP interface creation
TAP_DEV="tap0"
BRIDGE_DEV="br0"

if ip link show "$TAP_DEV" &>/dev/null; then
    echo "[INFO] Existing TAP interface '$TAP_DEV' detected. Re-provisioning..."
    sudo ip link delete "$TAP_DEV" type tuntap || true
fi

echo "[AEGIS-INIT] Generating virtual TAP device interface..."
sudo ip tuntap add "$TAP_DEV" mode tap user "$USER"
sudo ip addr add 172.16.0.1/24 dev "$TAP_DEV"
sudo ip link set "$TAP_DEV" up

# 3. Enable IP Forwarding and NAT (Masquerading) on parent interface to bridge microVM outbound flows
echo "[AEGIS-INIT] Enforcing kernel forwarding parameters and iptables masquerades..."
sudo sysctl -w net.ipv4.ip_forward=1 > /dev/null

PARENT_NIC=$(ip route | grep default | awk '{print $5}' | head -n 1)
sudo iptables -t nat -A POSTROUTING -o "$PARENT_NIC" -j MASQUERADE
sudo iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i "$TAP_DEV" -o "$PARENT_NIC" -j ACCEPT

echo "[AEGIS-INIT] Network bridge and packet routing successfully configured."
echo "[AEGIS-INIT] Operational baseline ready. Start emma-aegis.service to initialize."
