import time
import asyncio
import uuid
from typing import Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel

# -------------------------------------------------------------------------
# RUNTIME ORCHESTRATION RULES & EXECUTION CONTRACT
# -------------------------------------------------------------------------

class ResourceState(Enum):
    NORMAL = "normal"
    PRESSURE = "memory_pressure"
    GPU_SATURATED = "gpu_saturated"

class AgentTaskContext(BaseModel):
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_type: str = Field(..., description="e.g., 'SYSTEM_1_INFERENCE', 'OSINT_EXTRACTION', 'GLINER_BATCH'")
    priority: int = Field(..., description="Lower is higher priority. Security=1, Cognition=2, Background=3")
    system_level: int = Field(default=1, description="1 for fast heuristics, 2 for deep reasoning")
    state: str = "pending"
    created_at: float = Field(default_factory=time.time)

class EmmaOrchestrator:
    """
    The Central Linux Core Orchestrator for E.M.M.A.
    Defines agent scheduling, priority rules, GPU pressure handlers,
    and single-source-of-truth identity locking.
    """
    def __init__(self):
        self.gpu_vram_usage = 0.0
        self.max_vram_threshold = 0.92  # 92% VRAM triggers load-shedding
        
        self.task_queue = asyncio.PriorityQueue()
        self.active_tasks: Dict[str, AgentTaskContext] = {}
        
        # IDENTITY & STATE CONSISTENCY:
        # Guarantees that if a memory graph or core Identity state is mutating,
        # no parallel Ray worker can cause a race condition.
        self.subsystem_locks: Dict[str, asyncio.Lock] = {
            "semantic_memory": asyncio.Lock(),
            "episodic_memory": asyncio.Lock(),
            "aegis_firewall": asyncio.Lock(),
            "osint_graph": asyncio.Lock()
        }

    def update_hardware_metrics(self, vram_pct: float):
        """Called by telemetry telemetry stream."""
        self.gpu_vram_usage = vram_pct

    def _get_resource_state(self) -> ResourceState:
        if self.gpu_vram_usage >= self.max_vram_threshold:
            return ResourceState.GPU_SATURATED
        elif self.gpu_vram_usage >= 0.75:
            return ResourceState.PRESSURE
        return ResourceState.NORMAL

    async def schedule_agent_task(self, task: AgentTaskContext, payload: Any):
        """
        PRIORITY SCHEDULING & GPU LIMITS
        1. Security tasks pre-empt everything. 
        2. System 2 tasks are suspended/queued during GPU_SATURATED, yielding to System 1.
        """
        state = self._get_resource_state()
        
        if state == ResourceState.GPU_SATURATED and task.priority > 1:
            if task.system_level == 2:
                print(f"[Orchestrator] ⚠️ VRAM Saturated ({self.gpu_vram_usage*100}%). Suspending System 2 Task: {task.task_id}")
                task.state = "suspended"
                # Queue with lower priority (higher number) based on current pressure
                await self.task_queue.put((task.priority + 10, time.time(), task, payload))
                return
            else:
                print(f"[Orchestrator] ⚠️ Running System 1 task under GPU pressure: {task.task_id} (Risk of throttle)")

        # Enqueue for immediate dispatch to Ray workers
        task.state = "running"
        self.active_tasks[task.task_id] = task
        print(f"[Orchestrator] 🚀 Executing Task: {task.task_id} (Type: {task.task_type}, Tier: {task.priority})")
        # => Calls out to Ray Actor pool here...

    async def resolve_cognitive_conflicts(self, context_id: str, sys1_output: Any, sys2_output: Optional[Any]) -> Any:
        """
        CONFLICT RESOLUTION: System 1 vs System 2
        - System 1 emits immediately for fast UI feedback.
        - System 2 continues reasoning asynchronously.
        - If System 2 returns later with a contradiction AND high confidence, we issue an override.
        """
        if not sys2_output:
            return sys1_output
            
        sys2_confidence = getattr(sys2_output, 'confidence_score', 0.0)
        
        if sys2_confidence > 0.85:
            print(f"[Orchestrator] 🧠 System 2 Override Triggered for Session {context_id}.")
            print(f"[Orchestrator] Emitting EVENT_TYPE_SEMANTIC_CONSOLIDATION to silently patch UI.")
            # Emit override mutation via event_router here...
            return sys2_output
        
        print(f"[Orchestrator] System 2 completed but confidence ({sys2_confidence}) too low to override System 1.")
        return sys1_output

    async def mutate_identity_state(self, subsystem: str, mutation_fn, *args):
        """
        IDENTITY & STATE CONSISTENCY RULESS:
        Enforces strictly ordered, locked mutations on core data structures.
        """
        if subsystem not in self.subsystem_locks:
            raise ValueError(f"Unknown subsystem for identity locking: {subsystem}")
            
        async with self.subsystem_locks[subsystem]:
            print(f"[Orchestrator] 🔒 Acquired Identity Consistency Lock for [{subsystem}]")
            # Execute the function that alters the system state
            result = await mutation_fn(*args)
            return result
