import json
import time
import uuid
import redis
from enum import IntEnum, Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

# -------------------------------------------------------------------------
# PRIORITY & TAXONOMY DEFINITIONS
# -------------------------------------------------------------------------

class EventPriority(IntEnum):
    """
    Strict Priority Rules:
    Security (Highest) > Cognitive/OSINT (Medium) > UI/Telemetry (Lowest)
    Ensures that Ray workers and Redis consumers allocate processor time safely.
    """
    SECURITY_CRITICAL = 1
    COGNITIVE_MEDIUM = 2
    OSINT_MEDIUM = 3
    TELEMETRY_LOW = 4

class EventSubsystem(str, Enum):
    SECURITY = "security"
    COGNITIVE = "cognitive"
    MEMORY = "memory"
    OSINT = "osint"
    TELEMETRY = "telemetry"
    UI = "ui"

# -------------------------------------------------------------------------
# STANDARD EVENT MODEL
# -------------------------------------------------------------------------

class EmmaBaseEvent(BaseModel):
    """
    Standardized JSON payload structure for all distributed events in the E.M.M.A. architecture.
    Enforces payload integrity prior to Redis ingestion.
    """
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp_ms: int = Field(default_factory=lambda: int(time.time() * 1000))
    subsystem: EventSubsystem
    event_type: str = Field(..., description="Specific event action e.g., 'tarpit_events', 'decay_queue', 'system_1_reply'")
    priority: EventPriority
    source_node: str = Field(default="edge_core_1")
    payload: Dict[str, Any] = Field(default_factory=dict, description="The structural JSON payload body")
    cryptographic_signature: str = Field(default="unsigned", description="Placeholder for IPC cryptographic signing")

# -------------------------------------------------------------------------
# REDIS EVENT ROUTER & STREAMS
# -------------------------------------------------------------------------

class EmmaEventRouter:
    """
    Distributed Streams routing for the E.M.M.A Linux Edge.
    Interfaces with Redis to manage high-throughput event channels.
    """
    def __init__(self, redis_host: str = 'localhost', redis_port: int = 6379, db: int = 0):
        # Strict decode_responses for standard text/json transport
        self.client = redis.Redis(host=redis_host, port=redis_port, db=db, decode_responses=True)

    def _generate_topic_namespace(self, event: EmmaBaseEvent) -> str:
        """
        Defines the exact Redis topic taxonomy mapping.
        Format: emma:<subsystem>:<event_type>
        Example: emma:security:tarpit_events
                 emma:memory:decay_queue
        """
        return f"emma:{event.subsystem.value}:{event.event_type}"

    def _get_priority_firehose(self, priority: EventPriority) -> str:
        """
        Maintains aggregated priority queues for global listeners (e.g., Ray worker scheduler pools).
        """
        return f"emma:firehose:priority_tier_{priority.value}"

    def route_event(self, event: EmmaBaseEvent) -> str:
        """
        Validates and pushes payloads to specific Redis channels based on strict priority taxonomy.
        Uses Redis Streams (XADD) to guarantee sequential delivery and retention across the cluster.
        """
        topic = self._generate_topic_namespace(event)
        priority_topic = self._get_priority_firehose(event.priority)
        
        # Serialize payload body safely for Redis Streams (must be flat dict of strings)
        stream_payload = {
            "event_id": event.event_id,
            "timestamp_ms": str(event.timestamp_ms),
            "subsystem": event.subsystem.value,
            "event_type": event.event_type,
            "priority": str(event.priority.value),
            "source_node": event.source_node,
            "payload_json": json.dumps(event.payload),
            "cryptographic_signature": event.cryptographic_signature
        }

        try:
            # 1. Publish to the specific subsystem taxonomy channel (e.g., emma:memory:decay_queue)
            self.client.xadd(topic, stream_payload)
            
            # 2. Duplicate to the unified priority firehose for hierarchical execution polling
            self.client.xadd(priority_topic, stream_payload)
            
            print(f"[EventRouter] Routed event {event.event_id[:8]}... -> {topic} (Tier {event.priority.value})")
            return topic
        except redis.RedisError as e:
            print(f"[EventRouter] Critical routing failure: {e}")
            raise

    def listen_to_priority(self, priority: EventPriority, count: int = 10, block_ms: int = 5000):
        """
        Exposes a generalized consumer method to fetch new events off a strict priority channel.
        Ray workers use this to evaluate high-priority Security interventions before standard telemetry.
        """
        firehose = self._get_priority_firehose(priority)
        try:
            events = self.client.xread({firehose: '$'}, count=count, block=block_ms)
            return events
        except redis.RedisError as e:
            print(f"[EventRouter] Failed to consume stream: {e}")
            return []
