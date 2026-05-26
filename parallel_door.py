import sys
import os
import subprocess
from bcc import BPF
import ctypes

# Inline C implementation of XDP packet filter compiling in runtime with rigorous verifier bounds checking and stateful redirect maps
EBPF_C_CODE = """
#define KBUILD_MODNAME "parallel_door"
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/tcp.h>

struct drop_event_t {
    u32 src_ip;
    u16 target_port;
    char signature[16];
};

struct redirect_dest {
    u32 dst_ip;
    unsigned char dst_mac[6];
    u16 dst_port;
};

BPF_PERF_OUTPUT(drop_events);
BPF_HASH(redirect_map, u32, struct redirect_dest);

// Incremental checksum update helper for 16-bit values
static inline void csum_replace2(__u16 *csum, __u16 old, __u16 new) {
    __u32 temp = ~*csum & 0xffff;
    temp += ~old & 0xffff;
    temp += new;
    temp = (temp & 0xffff) + (temp >> 16);
    *csum = ~((temp & 0xffff) + (temp >> 16));
}

// Incremental checksum update helper for 32-bit values
static inline void csum_replace4(__u16 *csum, __u32 old, __u32 new) {
    csum_replace2(csum, old & 0xffff, new & 0xffff);
    csum_replace2(csum, old >> 16, new >> 16);
}

int filter_xdp_packet(struct xdp_md *ctx) {
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;

    struct ethhdr *eth = data;
    if ((void*)eth + sizeof(*eth) > data_end) return XDP_PASS;
    if (eth->h_proto != __constant_htons(ETH_P_IP)) return XDP_PASS;

    struct iphdr *ip = (void*)eth + sizeof(*eth);
    if ((void*)ip + sizeof(*ip) > data_end) return XDP_PASS;

    if (ip->protocol != IPPROTO_TCP) return XDP_PASS;

    // Strict verifier safety bounds checking for variable IPv4 Option headers length before payload read
    u32 ip_header_len = ip->ihl * 4;
    if (ip_header_len < 20) return XDP_PASS; // Bounds-check structural lower limits
    if ((void*)ip + ip_header_len > data_end) return XDP_PASS;

    struct tcphdr *tcp = (void*)ip + ip_header_len;
    if ((void*)tcp + sizeof(*tcp) > data_end) return XDP_PASS;

    u32 src_ip = ip->saddr;
    struct redirect_dest *dest = redirect_map.lookup(&src_ip);
    if (dest) {
        // Dynamic re-routing: Rewrite target properties statefully
        u32 old_dst_ip = ip->daddr;
        u16 old_dport = tcp->dest;
        u32 new_dst_ip = dest->dst_ip;
        u16 new_dport = __constant_htons(dest->dst_port);

        // Update IP Header Checksum incrementally
        csum_replace4(&ip->check, old_dst_ip, new_dst_ip);
        ip->daddr = new_dst_ip;

        // Update TCP Pseudo Header Checksum incrementally
        csum_replace4(&tcp->check, old_dst_ip, new_dst_ip);
        csum_replace2(&tcp->check, old_dport, new_dport);
        tcp->dest = new_dport;

        // Overwrite MAC address directly on ethernet frame to force interface redirection
        __builtin_memcpy(eth->h_dest, dest->dst_mac, 6);

        return XDP_TX; // Instantly transmit directly back down TX pipeline bypassing standard routing
    }

    u16 dport = __constant_ntohs(tcp->dest);
    if (dport == 22 || dport == 8443) {
        struct drop_event_t evt = {};
        evt.src_ip = ip->saddr;
        evt.target_port = dport;
        __builtin_memcpy(evt.signature, "JA4_MUTATION", 12);

        // Submit to perf ring buffer for Userspace Orchestration capture
        drop_events.perf_submit(ctx, &evt, sizeof(evt));
        return XDP_DROP;
    }
    return XDP_PASS;
}
"""

class RedirectDest(ctypes.Structure):
    _fields_ = [
        ("dst_ip", ctypes.c_uint32),
        ("dst_mac", ctypes.c_ubyte * 6),
        ("dst_port", ctypes.c_uint16)
    ]

class DropEvent(ctypes.Structure):
    _fields_ = [
        ("src_ip", ctypes.c_uint32),
        ("target_port", ctypes.c_uint16),
        ("signature", ctypes.c_char * 16)
    ]

class AegisNetworkSensor:
    def __init__(self, interface="eth0"):
        self.interface = interface
        self._verify_host_kernel_capabilities()
        self.bpf_module = BPF(text=EBPF_C_CODE)
        self.xdp_func = self.bpf_module.load_func("filter_xdp_packet", BPF.XDP)
        self.redirect_map = self.bpf_module["redirect_map"]

    def _verify_host_kernel_capabilities(self):
        """Pre-flight runtime checks validating kernel access before BCC initialization."""
        if os.getuid() != 0:
            raise PermissionError("eBPF XDP instrumentation requires Root (CAP_NET_ADMIN) credentials.")
        
        # Verify kernel headers are populated
        uname = os.uname().release
        headers_path = f"/usr/src/linux-headers-{uname}"
        if not os.path.exists(headers_path) and not os.path.exists(f"/lib/modules/{uname}/build"):
            print(f"[FATAL] Missing matching kernel headers for Release: {uname}.", file=sys.stderr)
            print("Execute: 'sudo apt install linux-headers-$(uname -r)' before booting E.M.M.A.", file=sys.stderr)
            sys.exit(1)

    def register_attacker_redirect(self, attacker_ip_str: str, redirect_ip_str: str, redirect_mac_hex: str, redirect_port: int):
        """Injects custom routing properties into XDP kernel hash maps on the fly."""
        import socket
        import struct
        
        # Convert values to native binary parameters
        attacker_ip_bin = socket.inet_aton(attacker_ip_str)
        attacker_key = ctypes.c_uint32(struct.unpack("<I", attacker_ip_bin)[0])
        
        redirect_ip_bin = socket.inet_aton(redirect_ip_str)
        redirect_ip_val = ctypes.c_uint32(struct.unpack("<I", redirect_ip_bin)[0])
        
        mac_bytes = bytes.fromhex(redirect_mac_hex.replace(":", ""))
        mac_array = (ctypes.c_ubyte * 6)(*mac_bytes)
        
        dest_val = RedirectDest(
            dst_ip=redirect_ip_val,
            dst_mac=mac_array,
            dst_port=ctypes.c_uint16(redirect_port)
        )
        
        self.redirect_map[attacker_key] = dest_val
        print(f"[AEGIS] Kernel Redirect Enforced: {attacker_ip_str} -> {redirect_ip_str}:{redirect_port}")

    def start_monitoring(self, on_drop_callback):
        """Attaches the XDP program to raw device driver socket layer."""
        print(f"[AEGIS] Compiling and attaching XDP to interface: {self.interface}")
        self.bpf_module.attach_xdp(self.interface, self.xdp_func, 0)

        def raw_perf_callback(cpu, data, size):
            event = ctypes.cast(data, ctypes.POINTER(DropEvent)).contents
            ip_str = f"{(event.src_ip & 0xff)}.{(event.src_ip >> 8) & 0xff}.{(event.src_ip >> 16) & 0xff}.{(event.src_ip >> 24) & 0xff}"
            on_drop_callback(ip_str, event.target_port, event.signature.decode('utf-8'))

        self.bpf_module["drop_events"].open_perf_buffer(raw_perf_callback)
        
        # Background worker loop pumping events up to scheduling queue
        while True:
            try:
                self.bpf_module.perf_buffer_poll(timeout=100)
            except KeyboardInterrupt:
                break

    def detach_sensor(self):
        """Removes hook from device driver, restoring original interface state."""
        print(f"[AEGIS] Detaching XDP packet filters from: {self.interface}")
        self.bpf_module.remove_xdp(self.interface, 0)
