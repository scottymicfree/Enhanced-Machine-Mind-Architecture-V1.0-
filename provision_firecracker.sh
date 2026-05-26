#!/bin/bash
# provision_firecracker.sh
#
# E.M.M.A. Aegis-Pandora MicroVM Provisioning Script
#
# Execution Requirements:
#   chmod +x provision_firecracker.sh
#   sudo ./provision_firecracker.sh
#
# Description:
#   Downloads a minimal Linux kernel and root filesystem required by the 
#   Firecracker orchestrator to securely sandbox brute-force attacks.

set -e

# Target paths as referenced by aegis_core.py
DEST_DIR="/opt/emma"
KERNEL_DEST="/vmlinux"
ROOTFS_DEST="/rootfs.ext4"

# Official Firecracker sample artifacts (x86_64)
KERNEL_URL="https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/kernels/vmlinux.bin"
ROOTFS_URL="https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/rootfs/bionic.rootfs.ext4"

echo "[AEGIS] Setting up Firecracker artifacts directory at ${DEST_DIR}..."
mkdir -p "${DEST_DIR}"

echo "[AEGIS] Downloading minimal linux kernel..."
curl -# -L -o "${DEST_DIR}/vmlinux" "${KERNEL_URL}"

echo "[AEGIS] Downloading Ubuntu Bionic rootfs..."
curl -# -L -o "${DEST_DIR}/rootfs.ext4" "${ROOTFS_URL}"

echo "[AEGIS] Setting required read permissions..."
chmod 644 "${DEST_DIR}/vmlinux"
chmod 644 "${DEST_DIR}/rootfs.ext4"

# Symlink to the root directory definitions hardcoded in the Aegis Core
echo "[AEGIS] Creating symlinks to ${KERNEL_DEST} and ${ROOTFS_DEST}..."
ln -sf "${DEST_DIR}/vmlinux" "${KERNEL_DEST}"
ln -sf "${DEST_DIR}/rootfs.ext4" "${ROOTFS_DEST}"

echo "[AEGIS] Provisioning complete. Artifacts are ready for the Firecracker Orchestrator."
