import uuid
import time
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# -------------------------------------------------------------------------
# OSINT REQUEST/RESPONSE EXECUTION CONTRACT
# -------------------------------------------------------------------------

class OSINTTarget(BaseModel):
    target_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: str = Field(..., description="DOMAIN, IP_ADDRESS, PERSON, ORGANIZATION")
    value: str = Field(..., description="The actual search parameter to initiate scraping/spidering")

class OSINTPipelineRequest(BaseModel):
    """
    The structured contract sent from the Cognitive Engine or UI into the OSINT workers.
    """
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    targets: List[OSINTTarget]
    depth: int = Field(default=2, description="Network traversal depth (0 = explicit targets only)")
    require_gliner: bool = Field(default=True, description="Enables GLiNER deep NLP extraction on scraped HTML/text")
    require_image_analysis: bool = Field(default=False)
    priority_level: int = Field(default=3)

class OSINTRelationship(BaseModel):
    """
    Defines edges between OSINT graph nodes.
    """
    source_node_id: str
    target_node_id: str
    relationship_type: str = Field(..., description="e.g. OWNS, SUBSIDIARY_OF, ASSOCIATED_IP")
    confidence: float = Field(default=1.0)
    evidence_uris: List[str] = Field(default_factory=list)

class OSINTGraphResponse(BaseModel):
    """
    The output payload containing extracted intelligence, ready to be ingested by Weaviate and the UI.
    """
    request_id: str
    timestamp_ms: int = Field(default_factory=lambda: int(time.time() * 1000))
    nodes: List[Dict[str, Any]] = Field(default_factory=list, description="List of OSINTGraphNode items (defined in proto)")
    edges: List[OSINTRelationship] = Field(default_factory=list)
    raw_unstructured_evidence: str = Field(default="", description="Relevant raw text snippets for System 2 to review")
    extraction_quality_score: float = Field(default=1.0)
