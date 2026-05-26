from pydantic import BaseModel, Field
from pydantic.networks import IPvAnyAddress, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime

class OSINTEntity(BaseModel):
    id: str = Field(..., description="Unique hash representing the identity signature")
    entity_type: str = Field(..., pattern="^(PERSON|ORGANIZATION|IP_ADDRESS|CRYPTO_WALLET|CVE)$")
    label: str = Field(..., min_length=1, max_length=128)
    confidence: float = Field(..., ge=0.0, le=1.0)
    source_origin: HttpUrl

class OSINTHoneypotMatch(BaseModel):
    attacker_ip: IPvAnyAddress
    ja4_fingerprint: str
    intercepted_payload: str
    targeted_honeytoken_id: str
    detected_at: datetime = Field(default_factory=datetime.utcnow)

class OSINTResponsePayload(BaseModel):
    job_id: str
    scraped_timestamp: datetime
    extracted_entities: List[OSINTEntity]
    unstructured_extracted_text: str
    metadata_clusters: Dict[str, Any]
