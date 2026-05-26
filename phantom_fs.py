import os
import sys
import errno
import logging
from fuse import FUSE, Operations, FuseOSError

logging.basicConfig(level=logging.INFO, format="[PHANTOM-FS] %(asctime)s - %(message)s")

class PhantomFileSystem(Operations):
    """
    FUSE Copy-on-Write (COW) split-view deceptive filesystem.
    Redirects write mutations of attackers into a sandboxed write directory (/tmp/sandbox_cow)
    while keeping original templates pristine and tracking detailed syscall telemetry.
    """
    def __init__(self, pristine_root, sandbox_cow):
        self.pristine_root = os.path.realpath(pristine_root)
        self.sandbox_cow = os.path.realpath(sandbox_cow)
        if not os.path.exists(self.sandbox_cow):
            os.makedirs(self.sandbox_cow, mode=0o700)

    def _get_active_path(self, partial):
        cow_path = os.path.join(self.sandbox_cow, partial.lstrip("/"))
        if os.path.exists(cow_path):
            return cow_path
        return os.path.join(self.pristine_root, partial.lstrip("/"))

    def _get_write_path(self, partial):
        cow_path = os.path.join(self.sandbox_cow, partial.lstrip("/"))
        cow_dir = os.path.dirname(cow_path)
        if not os.path.exists(cow_dir):
            os.makedirs(cow_dir, mode=0o755)
        return cow_path

    # --- Read Operations ---
    def getattr(self, path, fh=None):
        actual_path = self._get_active_path(path)
        st = os.lstat(actual_path)
        return dict((key, getattr(st, key)) for key in ('st_atime', 'st_ctime',
                    'st_gid', 'st_mode', 'st_mtime', 'st_size', 'st_uid'))

    def readdir(self, path, fh):
        pristine_dir = os.path.join(self.pristine_root, path.lstrip("/"))
        cow_dir = os.path.join(self.sandbox_cow, path.lstrip("/"))
        
        entries = {'.', '..'}
        if os.path.exists(pristine_dir):
            entries.update(os.listdir(pristine_dir))
        if os.path.exists(cow_dir):
            entries.update(os.listdir(cow_dir))
        return list(entries)

    def read(self, path, size, offset, fh):
        os.lseek(fh, offset, os.SEEK_SET)
        return os.read(fh, size)

    # --- Write / Mutation Interceptions ---
    def create(self, path, mode, fi=None):
        cow_path = self._get_write_path(path)
        logging.info(f"SYSCALL INTERCEPT: CREATE -> Deceptive honeypot file written: {path}")
        fd = os.open(cow_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, mode)
        return fd

    def write(self, path, data, offset, fh):
        logging.warning(f"DECEPTION INTERCEPT: WRITE -> Attacker modifying path '{path}' with {len(data)} bytes of payload")
        os.lseek(fh, offset, os.SEEK_SET)
        return os.write(fh, data)

    def open(self, path, flags):
        actual_path = self._get_active_path(path)
        # If modifying, duplicate pristine file to COW directory if not already present
        if (flags & (os.O_WRONLY | os.O_RDWR)):
            cow_path = self._get_write_path(path)
            if not os.path.exists(cow_path):
                # Copy original data to COW space
                with open(actual_path, 'rb') as f_src:
                    with open(cow_path, 'wb') as f_dst:
                        f_dst.write(f_src.read())
                logging.info(f"COW DUPLICATION: Cloned original file '{path}' to sandbox space")
            actual_path = cow_path

        return os.open(actual_path, flags)

    def truncate(self, path, length, fh=None):
        cow_path = self._get_write_path(path)
        with open(cow_path, 'r+') as f:
            f.truncate(length)

    def unlink(self, path):
        logging.warning(f"ATTACK TELEMETRY: Intercepted attempt to delete '{path}' to hide traces.")
        cow_path = os.path.join(self.sandbox_cow, path.lstrip("/"))
        if os.path.exists(cow_path):
            os.unlink(cow_path)
            return 0
        else:
            raise FuseOSError(errno.EACCES)

def mount_phantom_fs(mount_point, pristine, sandbox):
    print(f"[PHANTOM-FS] Mounting split-view system on {mount_point}...")
    FUSE(PhantomFileSystem(pristine, sandbox), mount_point, nothreads=True, foreground=True)
