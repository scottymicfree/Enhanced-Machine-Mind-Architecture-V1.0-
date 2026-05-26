# E.M.M.A. (Enhanced Machine Mind Architecture)

**Sovereign Neuro-Cognitive AI Operating System Kernel & Active Defense Matrix**

Version: 1.0.0-PROD

Target Architecture: Multi-GPU Linux Edge Server (ML/Defense) ⇄ High-Performance Windows Workstation (Operator UI)

## 1. SYSTEM COGNITIVE ARCHITECTURE & MATHEMATICAL MODEL

E.M.M.A. is not a standard software application; it is a distributed, self-contained AI operating system kernel. It marries real-time host-level operating system telemetry, kernel-tier packet filtering, stateful active sandbox containment, and dual-process cognitive reasoning into a secure, zero-trust network topology.

```text
       OPERATOR WORKSTATION (WINDOWS)                LINUX COGNITIVE EDGE (LINUX)
┌──────────────────────────────────────────┐     ┌───────────────────────────────────┐
│        React 18 / Zustand Client         │     │     Distributed Compute Fabric     │
│   (WebGPU Hippocampal Scatter Plot)      │     │         (Ray Actor Pools)         │
│                    │                     │     │                 │                 │
│         IPC (Tauri Webview)              │     │                 ▼                 │
│                    ▼                     │     │         Cognitive Engine          │
│          Tauri Rust Client Core          │     │        (System 1 / System 2)      │
│  (60Hz Gaze UDP, secure DPAPI Keyring)   │     │                 │                 │
│                    │                     │     │                 ▼                 │
│                    ▼                     │     │    Weaviate LTM Vector Database   │
│            gRPC HTTP/2 Stream            │     │    (Episodic & Semantic Classes)  │
│                    │                     │     │                 │                 │
└────────────────────┼─────────────────────┘     └─────────────────┼─────────────────┘
                     │           gRPC HTTP/2 Stream                │
                     └─────────────────────────────────────────────┘
```

### 1.1 Dual-Process Cognition (System 1 vs. System 2)

The cognitive layer mimics biological split-brain processes:

*   **System 1 (Autonomic / Fast):** Processes low-latency system events, parses lightweight telemetry, and extracts simple network patterns. Under normal constraints, it operates with negligible memory footprints.
*   **System 2 (Iterative / Slow):** Engages during complex investigative tasks or system mutations. It schedules multi-agent debates (Courthouse Mode), performs deep recursive Chain-of-Thought reasoning using un-quantized local LLMs via Ray, and proposes self-improvement codebase changes.

### 1.2 Multi-Dimensional Memory Space & Cosine Decay

Memory is stored as high-dimensional embedding vectors within a local Weaviate database. To prevent context overflow, a background worker prunes transient memories using an exponential decay algorithm. The salience of memory index `S(t)` over time `Δt` is calculated as:

`S(t) = S_0 * e^(-λ * Δt)`

Where `S_0` is the initial analytical relevance score, and `λ` is the decay coefficient. During the Sleep Cycle (Delta Phase), cognitive consolidation recalculates the Cosine Similarity between vector pairs `u` and `v` to detect logical contradictions:

`sim(u, v) = (u • v) / (||u|| ||v||)`

If `sim(u, v) >= Threshold` but the underlying propositional statements contradict, the system blocks automatic consolidation and triggers a System 2 arbitration event to resolve the conflict.

### 1.3 Active Defense & Stateful eBPF Redirects

The Aegis Security Subsystem operates at the Linux kernel tier using an eBPF XDP hook attached directly to the Network Interface Card (NIC) driver.

Unlike standard firewalls that silently drop attacker packets, E.M.M.A. performs stateful, on-the-fly packet header translation. When a brute-force attack is flagged by the user-space scheduler, the attacker's IP is registered in a secure BPF hash map. The XDP sensor intercepts subsequent packets, rewrites their Destination IP, MAC, and TCP Port, and recalculates the L3/L4 checksums incrementally:

`IP_Check_New = IP_Check_Old + ΔIP`
`TCP_Check_New = TCP_Check_Old + ΔIP + ΔPort`

Using the XDP_TX action, the modified packet is routed directly back down the interface into a Firecracker microVM, sandboxing the attacker inside a deceptive copy-on-write filesystem (PhantomFS) without severing their TCP session or alerting them to the intercept.

### 1.4 Immutable Merkle State Ledger

Every system mutation is chronologically locked inside an append-only SQLite ledger using a cryptographic Merkle sequence:

`H_n = SHA256(H_{n-1} || Serialize(Payload_n))`

If behavioral drift or a logic-breaking code mutation occurs, the operator can issue a rollback command. The rollback engine traverses the ledger backward, applying inverse operations (applying reverse Git patches to the codebase, and batch-deleting newly integrated Weaviate coordinates) to reconstruct the system's exact historical identity.

## 2. SYSTEM DEPENDENCIES & PREREQUISITES

To run the full hybrid infrastructure, the following hardware and software baselines must be met:

### 2.1 Operator Workstation (Windows Host)

*   **OS:** Windows 10/11 (Pro or Enterprise recommended for native DPAPI Keyring support).
*   **Hardware:** 16GB+ RAM, WebGPU-compatible graphics card (Intel, AMD, or NVIDIA).
*   **Software Requirements:**
    *   Node.js v18+ (for compiling the Vite/React frontend).
    *   Rust & Cargo (for compiling the Tauri native core).
    *   Python 3.10+ with OpenCV and MediaPipe.
    *   A physical webcam connected for 60Hz pupillary eye-gaze tracking.

### 2.2 Cognitive Edge Node (Linux Server)

*   **OS:** Ubuntu 22.04 LTS or Debian 12 (Kernel 5.15+ mandatory for eBPF CO-RE and FUSE).
*   **Hardware:** Bare-Metal Server (or Cloud instance with Nested Virtualization enabled: e.g., GCP n2-standard-4 or AWS .metal instances). Minimum 1x NVIDIA RTX 4090 / A6000 (24GB VRAM) is required to run the local LLM and GLiNER models simultaneously.
*   **Software Requirements:**
    *   Docker & Docker Compose with the NVIDIA Container Runtime installed.
    *   Linux kernel headers (`linux-headers-$(uname -r)`).
    *   Clang and LLVM installed (for CO-RE compilation).
    *   The `firecracker` binary and system FUSE utilities (`libfuse2` / `fusepy`).

## 3. MASTER PROVISIONING & CONFIGURATION

Before launching, both environments must be cryptographically and structurally configured to securely cross your local network boundaries.

### 3.1 Google Cloud OAuth PKCE Setup

E.M.M.A. uses Google OAuth to authenticate you locally and index context folders.

1.  Go to the Google Cloud Console.
2.  Create a new Project. Under OAuth Consent Screen, configure the App Name and set the scope to allow Desktop App authentication.
3.  Under Credentials, create an OAuth Client ID (Application Type: Desktop App).
4.  Save the Client ID and Client Secret.

### 3.2 Workspace Environment Mappings

Create a `.env` file inside your Windows `src-tauri` directory, and duplicate it inside `/opt/emma/state/` on your Linux server.

```env
# E.M.M.A. Runtime Credentials
GOOGLE_CLIENT_ID=your_gcp_client_id_here
GOOGLE_CLIENT_SECRET=your_gcp_client_secret_here

# Network Configuration Bridges
LINUX_EDGE_IP=192.168.1.100  # Put your Linux Edge Node's local IP address here
WINDOWS_UI_IP=192.168.1.50   # Put your Windows Workstation's local IP address here
```

## 4. SINGLE-CLICK STARTUP & OPERATIONS

The system has been packaged with automated initialization engines that check dependencies, mount virtual TAP bridges, compile code boundaries, and boot all subsystems in parallel.

### 4.1 Launching the Linux Cognitive Edge (Single-Click)

Copy the E.M.M.A. directory to `/opt/emma` on your Linux server, make the orchestration files executable, and run the setup script:

```bash
cd /opt/emma
chmod +x scripts/setup_edge_linux.sh scripts/init_aegis_hardware.sh edge_runtime/compile_protos.sh
sudo ./scripts/setup_edge_linux.sh
```

What this automated script does:

*   Verifies Intel/AMD CPU-virtualization and KVM access permissions on the host.
*   Creates the `tap0` virtual interface, configures IPv4 routing, and sets up IP forwarding with NAT masquerades.
*   Automatically downloads a minimal `vmlinux` kernel and an Alpine `rootfs.ext4` sandbox template.
*   Spins up Weaviate, Redis, Envoy, Ollama, and Ray container networks.
*   Invokes Ollama to pull the un-quantized `llama3:8b-instruct-q8_0` model.
*   Compiles the local `telemetry.proto` definitions and compiles the eBPF CO-RE object.
*   Installs and starts the `emma-aegis` systemd background service.

### 4.2 Launching the Windows Command Dashboard (Single-Click)

Clone the repository to your Windows machine, open PowerShell as an Administrator, and run:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\scripts\start_emma_windows.ps1
```

What this automated script does:

*   Validates Node, Cargo, and Rust environments, running `npm install` for frontend dependencies if missing.
*   Injects the local `.env` variables into the current session.
*   Automatically launches the background MediaPipe OpenCV gaze tracker (`gaze_tracker.py`), starting the 60Hz UDP data stream on `127.0.0.1:8124`.
*   Compiles the master gRPC Protobuf definitions via `build.rs` and launches Tauri in developer or release execution mode.

## 5. OPERATIONAL MANUAL: USING THE CLIENT INTERFACE

Once both systems are active, your Windows desktop application will unlock.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  [●] E.M.M.A. CORE // CLIENT                     CPU: 12.0% | GPU: 38°C | VRAM: 1.0 GB  │
├───────────────────────────────────────────────────────┬────────────────────────────────┤
│                                                       │ BASAL GANGLIA ACTIVE ROUTING   │
│                                                       │ [OSINT] [SANDBOX] [COG] [SEC]  │
│                                                       ├────────────────────────────────┤
│                                                       │ AEGIS PERIMETER INTERVENTION   │
│                                                       │ [ TRIGGER AEGIS LOCKDOWN ]     │
│                                                       ├────────────────────────────────┤
│                 HIPPOCAMPAL CONSTELLATION             │                                │
│                     (WEBGPU GRAPH)                    │                                │
│                                                       │    E.M.M.A. CONVERGENCE CHAT   │
│                           .                           │                                │
│                       .       .                       │    User: Scan active nodes.    │
│                     .   ●   .                         │    Emma: System is running     │
│                       .       .                       │    stable. 4 experts active.   │
│                           .                           │                                │
│                                                       │                                │
│                                                       │ [Type Query...]        [SEND]  │
└───────────────────────────────────────────────────────┴────────────────────────────────┘
```

### 5.1 Gaze-Driven Focus Mapping

*   **How it works:** The background Python script tracks your pupils. When you look at a specific memory node on the Hippocampal Constellation WebGPU graph, the coordinate map is smoothed and sent at 60Hz.
*   **Executing Focus Queries:** Press and hold `Spacebar` while focusing on a node cluster. E.M.M.A. will automatically pull the vector ID beneath your focus crosshair and output its semantic fact-file directly into the Convergence Console.

### 5.2 Interactive Telemetry Chat

The Chat Window is aware of the exact physical state of the hardware.

*   **Sample Command:** "Assess system diagnostics."
*   **Under-the-hood:** E.M.M.A. packages your prompt with a JSON payload of active GPU thermals, CPU load, and Ray cluster allocation. The local Llama 3 model processes the request, identifying if there is thermal throttling or memory saturation, and responds with a contextual system report.

### 5.3 Triggering Aegis Active Counter-Measures

The Aegis Security Panel lists active network threat events parsed by the eBPF kernel sensor.

*   **Manual Lockdown:** Click "Trigger Aegis Lockdown" to immediately route all foreign traffic hitting ports 22 and 8443 into the deceptive Firecracker microVM pool.
*   **Observing the Tarpit:** When a port-scanner is caught, you will see a red flashing target on the Aegis screen. Open the dropdown to inspect the attacker's shell commands, which are safely captured inside the copy-on-write PhantomFS directory.

## 6. TROUBLESHOOTING & RECOVERY

### 6.1 UI Latency / Infinite Re-render Loop Fix

If you experience stuttering or frame-drops inside the React Three Fiber viewport:

*   Ensure that you are running the optimized Zustand store (`store.ts`) implemented in V3.
*   High-frequency gaze and hardware telemetry have been decoupled from global state. If lag persists, verify that your browser or Tauri context has WebGL hardware acceleration enabled:
    *   Run: `chrome://gpu` inside your browser to check WebGPU state.

### 6.2 SQLite "Database is Locked" Exceptions

When multiple OSINT agents and memory processors commit vectors to Weaviate and log transactions simultaneously, SQLite may throw a lock exception:

*   Ensure the state ledger is running in Write-Ahead Logging (WAL) mode.
*   The scheduler automatically executes a `busy_timeout = 5000` parameter. If you are running an extreme workload, consider migrating the ledger to a distributed Cassandra/ScyllaDB cluster as detailed in the scaling notes.

### 6.3 eBPF Compilation / Injection Crashes

If starting `emma-aegis.service` fails with kernel compilation errors:

*   Ensure your Linux server release matches your installed headers. Run:
    ```bash
    sudo apt install -y linux-headers-$(uname -r)
    ```
*   Alternatively, compile the BPF code using Clang locally and load the pre-compiled `parallel_door.bpf.o` CO-RE object (this bypasses dynamic on-the-fly BCC compilation dependencies entirely).
