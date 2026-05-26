import asyncio
import logging
from typing import Dict, Any, List
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor
import pynvml # NVIDIA Management Library

logging.basicConfig(level=logging.INFO, format="[EMMA SCHEDULER] %(asctime)s - %(levelname)s - %(message)s")

@dataclass(order=True)
class ScheduledEvent:
    priority: int
    payload: Dict[str, Any] = field(compare=False)
    event_type: str = field(compare=False)

class EmmaBackpressureScheduler:
    def __init__(self):
        self.priority_queue = asyncio.PriorityQueue()
        self.active_system_mode = "SYSTEM_1"
        self.system2_running = False
        self.quantized_fallback_enabled = False
        self.executor = ThreadPoolExecutor(max_workers=4) # Prevent blocking the event loop
        
        # GPU telemetry properties
        try:
            pynvml.nvmlInit()
            self.gpu_count = pynvml.nvmlDeviceGetCount()
            self.handles = [pynvml.nvmlDeviceGetHandleByIndex(i) for i in range(self.gpu_count)]
            logging.info(f"Nvidia NVML successfully initialized. Tracking {self.gpu_count} GPU(s).")
        except Exception as e:
            self.handles = []
            logging.warning("NVIDIA NVML unavailable. Operating under soft CPU fallback schedulers.")

    async def enqueue_event(self, priority_level: int, event_type: str, payload: Dict[str, Any]):
        """
        Pushes events into the priority scheduler.
        Priority mapping matches emma_kernel.proto enum ranks:
        0 (LOWEST/UI) -> Priority score 4
        4 (CRITICAL/AEGIS) -> Priority score 0 (Higher priority processed first in asyncio.PriorityQueue)
        """
        priority_score = 4 - priority_level
        scheduled_item = ScheduledEvent(priority=priority_score, event_type=event_type, payload=payload)
        await self.priority_queue.put(scheduled_item)
        logging.info(f"Enqueued Event: {event_type} | Assigned priority index: {priority_score}")

    async def process_queue_loop(self):
        """Infinite loop processing tasks according to their strict priority hierarchy."""
        loop = asyncio.get_running_loop()
        while True:
            # Shift NVML tracking execution completely to an offloaded ThreadPoolExecutor to protect event loop
            await loop.run_in_executor(self.executor, self.check_backpressure_thresholds)
            
            task: ScheduledEvent = await self.priority_queue.get()
            logging.info(f"De-queued executing task: {task.event_type} (Priority Rank: {task.priority})")
            
            try:
                if task.priority == 0:  # CRITICAL (Aegis, Kernel Override)
                    # Offload any heavy payload manipulation or sub-process calls out of the main thread
                    await loop.run_in_executor(self.executor, self.execute_critical_task, task.payload)
                elif task.priority == 1: # HIGH (System 2, Code compilation)
                    await self.execute_high_priority_task(task.payload)
                else:
                    await self.execute_standard_task(task.payload)
            except Exception as e:
                logging.error(f"Task Execution Failure in queue loop: {str(e)}")
            finally:
                self.priority_queue.task_done()

    def check_backpressure_thresholds(self):
        """Inspects host telemetry at hardware layer. Executes synchronously inside ThreadPoolExecutor."""
        if not self.handles:
            return

        for i, handle in enumerate(self.handles):
            try:
                temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                utilization = (mem_info.used / mem_info.total) * 100.0

                # VRAM Saturation Circuit Breaker (VRAM > 95% or Thermals > 82C)
                if utilization > 95.0 or temp > 82:
                    logging.warning(f"Hardware threshold breach on GPU {i}! VRAM: {utilization:.1f}% | Temp: {temp}C")
                    if not self.quantized_fallback_enabled:
                        asyncio.run_coroutine_threadsafe(
                            self.trigger_backpressure_fallback(),
                            asyncio.get_event_loop()
                        )
            except Exception as e:
                logging.error(f"NVML Polling Error on GPU index {i}: {str(e)}")

    async def trigger_backpressure_fallback(self):
        """Forces immediate preemption: downsizes LLM context size and halts background processes."""
        self.quantized_fallback_enabled = True
        logging.critical("CRITICAL BACKPRESSURE SIGNAL: Downgrading MoE Expert Routing to FP8 fallback.")
        
        # Dispatch system command to drop non-critical CPU/GPU worker nodes
        await self.enqueue_event(
            priority_level=4, # CRITICAL priority
            event_type="EVENT_TYPE_HARDWARE_SATURATION",
            payload={"suspend_background_osint": True, "force_fp8_gating": True}
        )

    def execute_critical_task(self, payload: Dict[str, Any]):
        """Executes instant network blockages, sandboxing, and manual UI lockouts inside ThreadPoolExecutor."""
        logging.info("[EXECUTION] Injecting kernel XDP tarpit blocks...")
        # Deep integration logic connects to bcc module hooks here
        import time
        time.sleep(0.05)

    async def execute_high_priority_task(self, payload: Dict[str, Any]):
        """Handles deep reasoning loops, implementing System 1/System 2 preemption logic."""
        if self.quantized_fallback_enabled:
            logging.warning("System is saturated! Throttling System 2 iterative reasoning.")
            # Gracefully short-circuit recursion bounds
            payload["max_recursion_depth"] = 1
            
        logging.info("[EXECUTION] Initiating System 2 Multi-Agent Courthouse Debates...")
        self.system2_running = True
        # Emulate System 2 computation
        await asyncio.sleep(0.5)
        self.system2_running = False

    async def execute_standard_task(self, payload: Dict[str, Any]):
        """Runs standard tasks (OSINT spiders, memory updates, decay metrics)."""
        if self.system2_running:
            # PREEMPTION: Standard tasks yield the CPU/GPU thread completely if System 2 is engaged
            logging.info("[PREEMPTION] Postponing low-priority task to protect System 2 VRAM...")
            await asyncio.sleep(0.5)
            
        logging.info("[EXECUTION] Processing standard memory decay matrix checks...")
