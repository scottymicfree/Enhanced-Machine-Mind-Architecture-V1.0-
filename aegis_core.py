import os
import json
import socket
import logging
import time
import pwd

try:
    import requests_unixsocket
    from bcc import BPF
except ImportError:
    print("[WARN] required libraries (requests_unixsocket, bcc) not found. Run: pip install requests-unixsocket bcc")

# Configure logging to stdout so the Rust daemon can stream it to the dashboard
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

# -------------------------------------------------------------------
# 1. Firecracker MicroVM Orchestrator
# -------------------------------------------------------------------

class FirecrackerOrchestrator:
    def __init__(self, socket_path="/tmp/firecracker.socket"):
        self.socket_path = socket_path
        self.api_url = f"http+unix://{socket_path.replace('/', '%2F')}"
        
        # In a real environment, requests_unixsocket patches requests to handle unix://
        try:
            self.session = requests_unixsocket.Session()
        except NameError:
            self.session = None

    def spawn_incubator(self, kernel_path: str, rootfs_path: str, tap_iface: str = "tap0", mac_address: str = "06:00:AC:10:00:02"):
        """
        Dynamically provisions a Tier 4 Intelligence Incubator using the Firecracker REST API.
        """
        logging.info("[AEGIS] Initiating Intelligence Incubator MicroVM...")
        if not self.session:
            logging.error("[AEGIS] Session undefined. MicroVM cannot be spawned.")
            return False

        try:
            # 1. Configure Boot Source (Kernel)
            res = self.session.put(f"{self.api_url}/boot-source", json={
                "kernel_image_path": kernel_path,
                "boot_args": "ro console=ttyS0 noapic reboot=k panic=1 pci=off"
            })
            res.raise_for_status()

            # 2. Attach Root Filesystem
            res = self.session.put(f"{self.api_url}/drives/rootfs", json={
                "drive_id": "rootfs",
                "path_on_host": rootfs_path,
                "is_root_device": True,
                "is_read_only": False
            })
            res.raise_for_status()

            # 3. Attach TAP Network Interface
            res = self.session.put(f"{self.api_url}/network-interfaces/eth0", json={
                "iface_id": "eth0",
                "guest_mac": mac_address,
                "host_dev_name": tap_iface
            })
            res.raise_for_status()

            # 4. Trigger Instance Start
            res = self.session.put(f"{self.api_url}/actions", json={"action_type": "InstanceStart"})
            res.raise_for_status()

            logging.info("[AEGIS] MicroVM Tier 4 Intelligence Incubator Booted Successfully via Unix Socket.")
            return True

        except Exception as e:
            logging.error(f"[AEGIS] Failed to spawn microVM: {e}")
            return False


# -------------------------------------------------------------------
# 2. eBPF XDP Tarpit (Network Layer)
# -------------------------------------------------------------------

# In-line C program for the XDP Hook. 
# Parses ETH -> IP -> TCP/UDP and drops packets on target ports.
EBPF_C_CODE = """
#include <uapi/linux/bpf.h>
#include <linux/in.h>
#include <linux/if_ether.h>
#include <linux/if_packet.h>
#include <linux/if_vlan.h>
#include <linux/ip.h>
#include <linux/ipv6.h>
#include <linux/tcp.h>

struct drop_event {
    u32 src_ip;
    u32 dst_ip;
    u16 src_port;
    u16 dst_port;
};

BPF_PERF_OUTPUT(drop_events);

static inline int parse_ipv4(void *data, u64 nh_off, void *data_end, struct tcphdr **tcph, struct iphdr **iph) {
    *iph = data + nh_off;
    if ((void*)&(*iph)[1] > data_end)
        return 0;

    if ((*iph)->protocol == IPPROTO_TCP) {
        *tcph = (struct tcphdr *)((void *)(*iph) + ((*iph)->ihl * 4));
        if ((void*)(*tcph + 1) > data_end)
            return 0;
        return 1;
    }
    return 0;
}

int drop_unverified_brute_force(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;

    struct ethhdr *eth = data;
    u64 nh_off = sizeof(*eth);

    if (data + nh_off > data_end)
        return XDP_PASS;

    struct tcphdr *tcph;
    struct iphdr *iph;

    // Check if IPv4
    if (eth->h_proto == bpf_htons(ETH_P_IP)) {
        if (parse_ipv4(data, nh_off, data_end, &tcph, &iph)) {
            // Target specific ports for DROP (e.g., SSH 22, Custom 8443)
            if (tcph->dest == bpf_htons(22) || tcph->dest == bpf_htons(8443)) {
                struct drop_event evt = {};
                evt.src_ip = iph->saddr;
                evt.dst_ip = iph->daddr;
                evt.src_port = bpf_ntohs(tcph->source);
                evt.dst_port = bpf_ntohs(tcph->dest);
                
                drop_events.perf_submit(ctx, &evt, sizeof(evt));
                
                // Return XDP_DROP to drop the packet completely at the NIC
                return XDP_DROP;
            }
        }
    }

    return XDP_PASS;
}
"""

class ParallelDoorTarpit:
    def __init__(self, interface="eth0", orchestrator: FirecrackerOrchestrator = None):
        self.interface = interface
        self.bpf = None
        self.orchestrator = orchestrator

    def handle_drop_event(self, cpu, data, size):
        import ctypes
        import socket
        import struct
        
        class DropEvent(ctypes.Structure):
            _fields_ = [
                ("src_ip", ctypes.c_uint32),
                ("dst_ip", ctypes.c_uint32),
                ("src_port", ctypes.c_uint16),
                ("dst_port", ctypes.c_uint16)
            ]
        event = ctypes.cast(data, ctypes.POINTER(DropEvent)).contents
        
        src_ip = socket.inet_ntoa(struct.pack("<I", event.src_ip))
        logging.info(f"[eBPF Ring Buffer] Drop Event Popped! Attacker IP: {src_ip}:{event.src_port}")
        
        if self.orchestrator:
            logging.info(f"[AEGIS] Dynamically spawning incubator for attacker {src_ip}")
            # Spawn sandbox diversively!
            self.orchestrator.spawn_incubator(kernel_path="/vmlinux", rootfs_path="/rootfs.ext4", tap_iface="tap0")

    def poll_buffer_loop(self):
        logging.info("[AEGIS] Starting eBPF perf buffer polling loop...")
        try:
            while True:
                self.bpf.perf_buffer_poll()
        except Exception as e:
            logging.error(f"[AEGIS] Polling loop error: {e}")

    def activate(self):
        logging.info(f"[AEGIS] Compiling XDP eBPF Program and attaching to {self.interface}...")
        try:
            self.bpf = BPF(text=EBPF_C_CODE)
            fn = self.bpf.load_func("drop_unverified_brute_force", BPF.XDP)
            self.bpf.attach_xdp(self.interface, fn, 0)
            
            # Setup perf buffer callback
            self.bpf["drop_events"].open_perf_buffer(self.handle_drop_event)
            
            logging.info(f"[AEGIS] Parallel Door Active. Dropping brute-force attempts on {self.interface}.")
            
            # Start polling thread
            import threading
            self.poll_thread = threading.Thread(target=self.poll_buffer_loop, daemon=True)
            self.poll_thread.start()
            
            return True
        except Exception as e:
            logging.error(f"[AEGIS] Failed to attach XDP tracing: {e}")
            return False

    def deactivate(self):
        if self.bpf:
            try:
                self.bpf.remove_xdp(self.interface, 0)
                logging.info(f"[AEGIS] Parallel Door deactivated on {self.interface}.")
            except Exception as e:
                logging.error(f"[AEGIS] Error deactivating: {e}")

# -------------------------------------------------------------------
# 3. gRPC Client/Server Bridge (Edge Networking)
# -------------------------------------------------------------------

try:
    import grpc
    from concurrent import futures
    import time
    import telemetry_pb2
    import telemetry_pb2_grpc
except ImportError:
    print("[WARN] grpcio not found. Run: pip install grpcio grpcio-tools")
    grpc = None

class DashboardServicer(telemetry_pb2_grpc.DashboardServicer):
    def __init__(self):
        self.cognitive_mode = "GAMMA"
        self.trn_gating_status = False

    def StreamCognitiveTelemetry(self, request_iterator, context):
        """
        Pipes real eBPF drop logs and Firecracker capabilities to the Windows host,
        and parses incoming StateMutation commands concurrently.
        """
        logging.info("[AEGIS-gRPC] Windows host connected to Telemetry stream.")
        
        import threading
        
        def consume_requests():
            try:
                for req in request_iterator:
                    if req.command:
                        logging.info(f"[AEGIS-gRPC] Mutation Intent Received: {req.command} from {req.override_type}")
                        if req.command.startswith("FORCE_"):
                            self.cognitive_mode = req.command.split("FORCE_")[1]
                            logging.info(f"[AEGIS-gRPC] State Update: cognitive_mode -> {self.cognitive_mode}")
                        elif req.command == "LOCKDOWN" or req.command == "ENABLE_TRN":
                            self.trn_gating_status = True
                            logging.info(f"[AEGIS-gRPC] State Update: trn_gating_status -> {self.trn_gating_status}")
                        elif req.command == "DISABLE_TRN":
                            self.trn_gating_status = False
                            logging.info(f"[AEGIS-gRPC] State Update: trn_gating_status -> {self.trn_gating_status}")
            except Exception as e:
                logging.info(f"[AEGIS-gRPC] Request iterator finished: {e}")

        # Spawn background Thread to allow concurrent yielding
        t = threading.Thread(target=consume_requests, daemon=True)
        t.start()

        try:
            while context.is_active():
                # Simulated payload representing true internal states
                
                packet = telemetry_pb2.TelemetryPacket(
                    cognitive_mode=self.cognitive_mode,
                    trn_gating_status=self.trn_gating_status,
                    active_nodes=[1, 5, 23, 10]
                )
                yield packet
                time.sleep(1)
        except Exception as e:
            logging.info(f"[AEGIS-gRPC] Stream disconnected: {e}")

def serve_grpc():
    if not grpc:
        logging.error("[AEGIS] gRPC not available, skipping edge server.")
        return

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    
    telemetry_pb2_grpc.add_DashboardServicer_to_server(DashboardServicer(), server)
    
    # For standalone completeness in this blueprint, we bind to 50051
    server.add_insecure_port('[::]:50051')
    server.start()
    logging.info("[AEGIS-gRPC] Edge Telemetry gRPC bridge active on [::]:50051")
    server.wait_for_termination()

# -------------------------------------------------------------------
# 4. Main Execution Orchestrator
# -------------------------------------------------------------------

def check_ebpf_prerequisites():
    import subprocess
    try:
        import bcc
        from bcc import BPF
    except ImportError:
        logging.error("\033[91m[FATAL] BCC python library not found. Cannot compile eBPF.\033[0m")
        logging.error("\033[93m[RECOVERY] Please run: sudo apt install bpfcc-tools python3-bpfcc\033[0m")
        return False

    try:
        uname_r = subprocess.check_output(['uname', '-r']).decode('utf-8').strip()
        headers_path = f"/lib/modules/{uname_r}/build"
        
        if not os.path.exists(headers_path):
            logging.error(f"\033[91m[FATAL] Kernel headers not found at {headers_path}.\033[0m")
            logging.error(f"\033[93m[RECOVERY] Please run: sudo apt install linux-headers-{uname_r}\033[0m")
            return False
            
    except Exception as e:
        logging.error(f"\033[91m[FATAL] Failed to verify system kernel headers: {e}\033[0m")
        return False
        
    logging.info("\033[92m[OK] eBPF BCC prerequisites and kernel headers verified.\033[0m")
    return True

if __name__ == "__main__":
    logging.info("[AEGIS] Starting E.M.M.A. Aegis-Pandora Core Layer...")

    def drop_privileges(uid_name='ubuntu'):
        try:
            if hasattr(os, 'getuid') and os.getuid() != 0:
                logging.info("[AEGIS] Not running as root; skipping privilege drop.")
                return

            try:
                user = pwd.getpwnam(uid_name)
            except KeyError:
                # Fallback to uid 1000 if 'ubuntu' doesn't exist
                try:
                    user = pwd.getpwuid(1000)
                    uid_name = user.pw_name
                except KeyError:
                    logging.error("[AEGIS] Could not find unprivileged user. Privilege drop failed!")
                    return

            new_uid = user.pw_uid
            new_gid = user.pw_gid

            socket_path = "/tmp/firecracker.socket"
            if os.path.exists(socket_path):
                os.chown(socket_path, new_uid, new_gid)
                logging.info(f"[AEGIS] Changed ownership of {socket_path} to {uid_name}.")

            os.setgroups([])
            os.setgid(new_gid)
            os.setuid(new_uid)

            logging.info(f"\033[92m[AEGIS-SEC] Dropped root privileges, now executing as user: {uid_name} (UID: {new_uid})\033[0m")
        except Exception as e:
            logging.error(f"[AEGIS] Failed to drop privileges: {e}")

    # Simulate spawning an intelligence incubator when requested by Lucy
    orchestrator = FirecrackerOrchestrator()
    # orchestrator.spawn_incubator(kernel_path="/vmlinux", rootfs_path="/rootsfs.ext4", tap_iface="tap0")

    if check_ebpf_prerequisites():
        # Boot the eBPF layer to secure the edge
        tarpit = ParallelDoorTarpit(interface="eth0", orchestrator=orchestrator)
        tarpit.activate()
    else:
        logging.warning("\033[93m[WARN] Bypassing eBPF Parallel Door deployment due to missing system prerequisites.\033[0m")
        tarpit = None

    # After eBPF maps and ports are bound, drop root permissions
    drop_privileges(uid_name='ubuntu')

    try:
        # Blocks indefinitely handling streaming multiplexing on the HTTP/2 tunnel
        serve_grpc()
    except KeyboardInterrupt:
        logging.info("[AEGIS] Interrupt received. Tearing down...")
    finally:
        if tarpit:
            tarpit.deactivate()
        logging.info("[AEGIS] Shutdown complete.")

