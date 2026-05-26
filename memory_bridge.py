import time
import grpc
import weaviate
from concurrent import futures

# Import the generated protobuf classes 
# (You must run the grpc_tools.protoc compilation first)
import telemetry_pb2
import telemetry_pb2_grpc

class DashboardServicer(telemetry_pb2_grpc.DashboardServicer):
    def __init__(self, weaviate_client):
        self.client = weaviate_client

    def StreamTelemetry(self, request, context):
        print("Client connected to gRPC telemetry stream.")
        try:
            while True:
                # Query Weaviate for EpisodicMemory vectors
                response = (
                    self.client.query
                    .get("EpisodicMemory", ["label", "isDecaying"])
                    .with_additional("vector")
                    .with_limit(100)
                    .do()
                )

                memory_vectors = []
                if "data" in response and "Get" in response["data"]:
                    memories = response["data"]["Get"].get("EpisodicMemory", [])
                    for i, mem in enumerate(memories):
                        vec = mem.get("_additional", {}).get("vector", [0, 0, 0])
                        # Handle dimension mismatch safely
                        x = vec[0] if len(vec) > 0 else 0
                        y = vec[1] if len(vec) > 1 else 0
                        z = vec[2] if len(vec) > 2 else 0
                        
                        memory_vectors.append(telemetry_pb2.MemoryVector(
                            id=f"mem_{i}",
                            x=x,
                            y=y,
                            z=z,
                            is_decay_active=mem.get("isDecaying", False),
                            semantic_label=mem.get("label", "unknown")
                        ))

                # Yield the structured protobuf response
                yield telemetry_pb2.DashboardResponse(
                    hardware=telemetry_pb2.HardwareMetrics(
                        cpu_usage=45.2,
                        ram_usage=78.1,
                        tpu_usage=12.0,
                        temperature=42.0
                    ),
                    spatial_vectors=memory_vectors,
                    neuro_phase="SPINDLE_N2",
                    threats=[] # Extend with actual threat querying if needed
                )
                time.sleep(1) # Stream interval
        except grpc.RpcError as e:
            print(f"Stream broken: {e}")

def serve():
    # Connect to local Weaviate instance
    print("Connecting to local Weaviate at http://localhost:8080...")
    client = weaviate.Client("http://localhost:8080")
    
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    telemetry_pb2_grpc.add_DashboardServicer_to_server(
        DashboardServicer(client), server
    )
    
    server.add_insecure_port('[::]:50051')
    print("gRPC server listening on port 50051")
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
