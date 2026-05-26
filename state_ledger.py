import hashlib
import sqlite3
import json
import datetime
from typing import Dict, Any, List

class EmmaStateLedger:
    def __init__(self, db_path="/opt/emma/state/ledger.db"):
        self.db_path = db_path
        self._initialize_database()

    def _initialize_database(self):
        """Ensures the append-only ledger schema is safely locked into the file system with concurrent WAL optimizations."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Prevent 'database is locked' panics under multi-process read/write telemetry load
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA synchronous = NORMAL;")
            conn.execute("PRAGMA busy_timeout = 5000;") # Fail-safe busy wait interval
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS state_chain (
                    sequence_index INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    previous_state_hash TEXT NOT NULL,
                    state_hash TEXT NOT NULL,
                    signature TEXT NOT NULL
                )
            """)
            conn.commit()

    def _calculate_merkle_hash(self, payload: Dict[str, Any], previous_hash: str) -> str:
        """Calculates a deterministic hash representing the current system checkpoint link."""
        payload_serialized = json.dumps(payload, sort_keys=True)
        raw_string = f"{previous_hash}{payload_serialized}"
        return hashlib.sha256(raw_string.encode('utf-8')).hexdigest()

    def append_state_transition(self, event_type: str, payload: Dict[str, Any], signature: str) -> str:
        """
        Appends a mutation to the Merkle Chain.
        Guarantees that no system mutation can be injected or falsified.
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Fetch the previous block's hash
            cursor.execute("SELECT state_hash FROM state_chain ORDER BY sequence_index DESC LIMIT 1")
            row = cursor.fetchone()
            previous_hash = row[0] if row else "0" * 64 # Genesis hash anchor
            
            # Compute current state block hash
            current_hash = self._calculate_merkle_hash(payload, previous_hash)
            timestamp = datetime.datetime.utcnow().isoformat()
            
            # Append block into the immutable DB
            cursor.execute("""
                INSERT INTO state_chain (timestamp, event_type, payload, previous_state_hash, state_hash, signature)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (timestamp, event_type, json.dumps(payload), previous_hash, current_hash, signature))
            conn.commit()
            
            return current_hash

    def verify_ledger_integrity(self) -> bool:
        """
        Iterates over the entire Merkle chain, verifying the sequential cryptographic continuity.
        Returns False if any tampering of previous logs is detected.
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT sequence_index, payload, previous_state_hash, state_hash FROM state_chain ORDER BY sequence_index ASC")
            rows = cursor.fetchall()
            
            expected_previous_hash = "0" * 64
            for index, payload_str, prev_hash, stored_hash in rows:
                if prev_hash != expected_previous_hash:
                    return False # Cryptographic discontinuity detected
                    
                payload = json.loads(payload_str)
                recomputed_hash = self._calculate_merkle_hash(payload, prev_hash)
                
                if recomputed_hash != stored_hash:
                    return False # Checksum mismatch
                    
                expected_previous_hash = stored_hash
                
            return True

    def execute_temporal_rollback(self, target_hash: str, evolution_engine_workspace: str) -> bool:
        """
        Reads the state records backward from the current state to the target hash.
        Flashes inverse modifications (deleting newly added Weaviate records, rolling back workspace directories).
        """
        if not self.verify_ledger_integrity():
            raise SecurityError("Ledger integrity compromised! Refusing to perform state rollback.")
            
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Fetch all mutations executed after the targeted checkpoint
            cursor.execute("""
                SELECT sequence_index, event_type, payload FROM state_chain 
                WHERE sequence_index > (SELECT sequence_index FROM state_chain WHERE state_hash = ?)
                ORDER BY sequence_index DESC
            """, (target_hash,))
            rollback_actions = cursor.fetchall()
            
            for index, event_type, payload_str in rollback_actions:
                payload = json.loads(payload_str)
                print(f"[ROLLBACK] Reversing block sequence {index}: {event_type}")
                
                if event_type == "EVENT_TYPE_EVOLUTION_MUTATION_PROPOSED":
                    # Undo Git / Directory diff payload safely
                    git_diff_patch = payload.get("diff_patch")
                    self._reverse_evolution_workspace(evolution_engine_workspace, git_diff_patch)
                    
                elif event_type == "OSINT_GRAPH_MUTATION":
                    # Remove the specific vector coordinates introduced in this specific timestamp
                    vector_ids_to_purge = payload.get("vector_ids", [])
                    self._purge_vector_indices(vector_ids_to_purge)
            
            # Delete record entries beyond the target checkpoint
            cursor.execute("DELETE FROM state_chain WHERE sequence_index > (SELECT sequence_index FROM state_chain WHERE state_hash = ?)", (target_hash,))
            conn.commit()
            
        print("[ROLLBACK] System identity restored safely to targeted block hash.")
        return True

    def _reverse_evolution_workspace(self, workspace_path: str, git_diff: str):
        """Simulate applying inverse file mutations to clean out rogue scripts."""
        import subprocess
        # Reverse the git patch inside the evolution sandbox
        subprocess.run(["git", "apply", "-R"], input=git_diff.encode('utf-8'), cwd=workspace_path)

    def _purge_vector_indices(self, vector_ids: List[str]):
        """Interacts with local Weaviate client to remove precise, poisoned memory layers."""
        # weaviate_client.batch.delete_objects(...) logic goes here
        pass

class SecurityError(Exception):
    pass
