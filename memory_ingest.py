import os
import time
import uuid
import logging
import random

try:
    import weaviate
except ImportError:
    print("[WARN] weaviate-client not found. Run: pip install weaviate-client")
    weaviate = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

def setup_weaviate(client):
    class_obj = {
        "class": "EpisodicMemory",
        "description": "Episodic memory traces for E.M.M.A. cognitive processing",
        "properties": [
            {"name": "x", "dataType": ["number"]},
            {"name": "y", "dataType": ["number"]},
            {"name": "z", "dataType": ["number"]},
            {"name": "decay_status", "dataType": ["boolean"]},
            {"name": "cluster_id", "dataType": ["string"]},
            {"name": "type", "dataType": ["string"]},
            {"name": "content", "dataType": ["text"]},
        ]
    }
    
    try:
        if not client.schema.exists("EpisodicMemory"):
            logging.info("Creating EpisodicMemory schema in Weaviate...")
            client.schema.create_class(class_obj)
        else:
            logging.info("EpisodicMemory schema already exists.")
    except Exception as e:
        logging.error(f"Failed to setup schema: {e}")

def run_ingestion():
    if not weaviate:
        return
        
    logging.info("Initializing Weaviate target connections for Spindle Ingestion...")
    try:
        client = weaviate.Client("http://localhost:8080")
    except Exception as e:
        logging.error(f"Could not connect to Weaviate: {e}")
        return

    setup_weaviate(client)

    logging.info("Starting EpisodicMemory N2_SPINDLE ingestion loop...")
    while True:
        try:
            # Generate synthetic cognitive spindle trace
            # In production, this would be an actual LLM embedding output
            # For local testing, we generate random 3D distribution mimicking vector space
            memory_trace = {
                "x": random.uniform(-10.0, 10.0),
                "y": random.uniform(-10.0, 10.0),
                "z": random.uniform(-10.0, 10.0),
                "decay_status": random.choice([True, False, False, False]),
                "cluster_id": str(uuid.uuid4()),
                "type": "N2_SPINDLE",
                "content": f"Simulated episodic thought pattern: {random.randint(1000, 9999)}"
            }
            
            client.data_object.create(
                data_object=memory_trace,
                class_name="EpisodicMemory"
            )
            logging.info(f"[Ingest] Inserted N2_SPINDLE trace: {memory_trace['cluster_id']}")
            
            time.sleep(2.0)  # Simulate cognitive thought generation rate
            
        except Exception as e:
            logging.error(f"Ingestion error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    run_ingestion()
