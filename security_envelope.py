import os
import stat
import logging
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature

class SecureNodeEnvelope:
    def __init__(self, key_dir="/dev/shm/emma_secure_keys"):
        self.key_dir = key_dir
        self.private_key_path = os.path.join(self.key_dir, "node_identity.pem")
        self.public_key_path = os.path.join(self.key_dir, "node_identity.pub")
        self._provision_ram_key_enclave()

    def _provision_ram_key_enclave(self):
        """Secures storage inside RAM-disk (tmpfs) preventing swap/disk leaks of nodes keys."""
        try:
            if not os.path.exists(self.key_dir):
                os.makedirs(self.key_dir, mode=0o700)
            
            if not os.path.exists(self.private_key_path):
                private_key = ed25519.Ed25519PrivateKey.generate()
                public_key = private_key.public_key()

                # Serialize private key with absolute restricted owner-only read-rights (0400)
                with open(self.private_key_path, "wb") as priv_file:
                    priv_file.write(private_key.private_bytes(
                        encoding=serialization.Encoding.PEM,
                        format=serialization.PrivateFormat.OpenSSH,
                        encryption_algorithm=serialization.NoEncryption()
                    ))
                os.chmod(self.private_key_path, stat.S_IRUSR)

                # Serialize public key
                with open(self.public_key_path, "wb") as pub_file:
                    pub_file.write(public_key.public_bytes(
                        encoding=serialization.Encoding.PEM,
                        format=serialization.PublicFormat.OpenSSH
                    ))
                os.chmod(self.public_key_path, stat.S_IRUSR | stat.S_IWUSR)
        except Exception as e:
            logging.critical(f"KEY ENCLAVE INITIALIZATION FAIL: {str(e)}")
            raise SystemError("Failed to initialize cryptographic runtime enclave. Failing closed.")

    def sign_payload(self, data: bytes) -> bytes:
        """Signs binary packets using standard Ed25519 cryptography."""
        try:
            with open(self.private_key_path, "rb") as key_file:
                private_key = serialization.load_pem_private_key(key_file.read(), password=None)
            return private_key.sign(data)
        except Exception as e:
            logging.error(f"PAYLOAD SIGNATURE GENERATION EXCEPTION: {str(e)}")
            raise CryptographicError("Failed to sign node packet. Aborting transmission.")

    def verify_payload(self, data: bytes, signature: bytes, public_key_bytes: bytes) -> bool:
        """Verifies integrity and origin signature of incoming inter-node payloads. Fails closed on signature errors."""
        try:
            public_key = serialization.load_pem_public_key(public_key_bytes)
            public_key.verify(signature, data)
            return True
        except InvalidSignature as e:
            # Throw explicitly to prevent silent ingestion drops masking active brute-force spoofing
            logging.critical("SIGNATURE FAILURE: Packet validation check failed! Possible payload interception.")
            raise CryptographicError(f"Zero-trust compliance breach: Signature verification failed. Details: {str(e)}")
        except Exception as e:
            logging.critical(f"MALFORMED SECURITY ENVELOPE STRUCT: {str(e)}")
            raise CryptographicError(f"Verification engine aborted. Envelope payload structure corrupted: {str(e)}")

class CryptographicError(Exception):
    pass
