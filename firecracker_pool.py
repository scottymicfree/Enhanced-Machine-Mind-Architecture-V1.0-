import socket
import http.client
import json
import os
import subprocess

class UnixSocketHTTPClient(http.client.HTTPConnection):
    """Subclasses connection to bypass standard TCP requirements, using IPC Unix sockets instead."""
    def __init__(self, socket_path):
        super().__init__("localhost")
        self.socket_path = socket_path

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.connect(self.socket_path)

class FirecrackerSandboxManager:
    def __init__(self, socket_dir="/tmp/firecracker"):
        self.socket_dir = socket_dir
        if not os.path.exists(self.socket_dir):
            os.makedirs(self.socket_dir, mode=0o700)

    def spawn_intelligence_incubator(self, vm_id: str, kernel_path: str, rootfs_path: str):
        """Launches a microVM instance configured with PhantomFS deceptive structures."""
        socket_path = os.path.join(self.socket_dir, f"{vm_id}.socket")
        
        # Clean stale UNIX sockets
        if os.path.exists(socket_path):
            os.remove(socket_path)

        # Launch the physical Firecracker process in background
        subprocess.Popen([
            "firecracker",
            "--api-sock", socket_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Wait for Unix Socket initialization
        import time
        for _ in range(50):
            if os.path.exists(socket_path):
                break
            time.sleep(0.01)

        client = UnixSocketHTTPClient(socket_path)

        # Step 1: Push Boot Source Configurations
        boot_source = {
            "kernel_image_path": kernel_path,
            "boot_args": "console=ttyS0 reboot=k panic=1 pci=off"
        }
        client.request("PUT", "/boot-source", json.dumps(boot_source), {"Content-Type": "application/json"})
        response = client.getresponse()
        assert response.status == 204, f"Failed kernel boot config: {response.read()}"

        # Step 2: Bind Root filesystem
        drive = {
            "drive_id": "rootfs",
            "path_on_host": rootfs_path,
            "is_root_device": True,
            "is_read_only": False
        }
        client.request("PUT", "/drives/rootfs", json.dumps(drive), {"Content-Type": "application/json"})
        response = client.getresponse()
        assert response.status == 204, f"Failed file mount: {response.read()}"

        # Step 3: Trigger physical CPU execution
        action = {"action_type": "InstanceStart"}
        client.request("PUT", "/actions", json.dumps(action), {"Content-Type": "application/json"})
        response = client.getresponse()
        assert response.status == 204, f"Failed VM Boot: {response.read()}"

        print(f"[AEGIS] Virtual sandbox {vm_id} successfully online.")

    def terminate_incubator(self, vm_id: str):
        """Gracefully terminates guest execution and releases allocated memory."""
        socket_path = os.path.join(self.socket_dir, f"{vm_id}.socket")
        # In Firecracker, to cleanly terminate we kill the background process wrapping the socket
        # Find the process holding the UNIX socket file descriptor
        try:
            pids = subprocess.check_output(["fuser", socket_path]).decode().strip()
            for pid in pids.split():
                os.system(f"kill -9 {pid}")
            os.remove(socket_path)
            print(f"[AEGIS] Decommissioned VM: {vm_id}")
        except subprocess.CalledProcessError:
            pass
