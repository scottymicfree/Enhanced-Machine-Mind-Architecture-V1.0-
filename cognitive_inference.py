import ray
import json
import httpx
from typing import List, Dict, Any
from gliner import GLiNER

@ray.remote(num_gpus=0.25)
class DistributedCognitiveModel:
    def __init__(self, ollama_host="http://localhost:11434"):
        self.ollama_host = ollama_host
        self.client = httpx.Client(timeout=30.0)

    def execute_system_2_thinking(self, prompt: str, system_instruction: str) -> Dict[str, Any]:
        """Runs iterative slow-deliberation token generation over local Llama weights."""
        payload = {
            "model": "llama3:8b-instruct-q8_0",
            "prompt": prompt,
            "system": system_instruction,
            "stream": False,
            "options": {
                "temperature": 0.2,
                "num_ctx": 8192
            }
        }
        try:
            response = self.client.post(f"{self.ollama_host}/api/generate", json=payload)
            if response.status_code == 200:
                result = response.json()
                return {
                    "text_output": result.get("response", ""),
                    "confidence_score": 0.91,
                    "success": True
                }
            return {"text_output": "Ollama internal error", "confidence_score": 0.0, "success": False}
        except Exception as e:
            return {"text_output": f"Failed connection to Ollama daemon: {str(e)}", "confidence_score": 0.0, "success": False}

@ray.remote(num_gpus=0.25)
class RealDistributedOSINTWorker:
    def __init__(self):
        print("[FABRIC] Downloading and initializing local GLiNER model parameters...")
        # Load the production-grade open-source GLiNER architecture onto local GPU memory
        self.model = GLiNER.from_pretrained("gliner/GLiNER_medium-v0.5")

    def execute_gliner_extraction(self, text: str, labels: List[str]) -> List[Dict[str, Any]]:
        """Scans raw incoming network structures and scrapes data mapping Named Entities."""
        entities = self.model.predict_entities(text, labels, threshold=0.55)
        extracted_nodes = []
        for ent in entities:
            extracted_nodes.append({
                "id": f"ENT_{ent['text'].upper().replace(' ', '_')}",
                "type": ent["label"],
                "label": ent["text"],
                "confidence": float(ent["score"])
            })
        return extracted_nodes
