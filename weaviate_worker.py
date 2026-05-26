import weaviate
from sentence_transformers import SentenceTransformer
import uuid
import datetime
from typing import List, Dict, Any

class EmmaMemoryWorker:
    def __init__(self, weaviate_url="http://localhost:8080"):
        self.client = weaviate.Client(url=weaviate_url)
        # Use a high-efficiency local embedding model
        self.encoder = SentenceTransformer("all-MiniLM-L6-v2")
        self._initialize_vector_schemas()

    def _initialize_vector_schemas(self):
        """Initializes the multi-dimensional cognitive memory tables if missing."""
        classes_to_create = [
            {
                "class": "EpisodicMemory",
                "description": "Chronological sequences of node operations and environmental traces.",
                "properties": [
                    {"name": "document_text", "dataType": ["text"]},
                    {"name": "analytical_salience_score", "dataType": ["number"]},
                    {"name": "associated_entities", "dataType": ["text[]"]},
                    {"name": "last_accessed_timestamp", "dataType": ["date"]}
                ]
            },
            {
                "class": "SemanticMemory",
                "description": "Abstracted structural knowledge harvested during sleep-phase consolidation.",
                "properties": [
                    {"name": "concept", "dataType": ["string"]},
                    {"name": "factual_context", "dataType": ["text"]},
                    {"name": "contradiction_index", "dataType": ["number"]}
                ]
            }
        ]

        for schema_class in classes_to_create:
            if not self.client.schema.exists(schema_class["class"]):
                self.client.schema.create_class(schema_class)
                print(f"[MEMORY] Created class schema: {schema_class['class']}")

    def ingest_episodic_record(self, text: str, salience: float, entities: List[str]):
        """Vectorizes and commits episodic memories directly to physical storage."""
        # Calculate local embeddings
        vector = self.encoder.encode(text).tolist()

        record_payload = {
            "document_text": text,
            "analytical_salience_score": salience,
            "associated_entities": entities,
            "last_accessed_timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }

        # Issue insert with custom calculated vector
        self.client.data_object.create(
            data_object=record_payload,
            class_name="EpisodicMemory",
            uuid=str(uuid.uuid4()),
            vector=vector
        )
        print(f"[MEMORY] Logged episodic vector of size: {len(vector)}")
