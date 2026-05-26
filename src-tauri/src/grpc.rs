use tauri::{AppHandle, Manager};
use tokio_stream::wrappers::ReceiverStream;
use tonic::Request;
use futures::StreamExt;

// Note: Tonic will generate code into the OUT_DIR during build.rs
pub mod emma_telemetry {
    // Suppress warnings on generated code if compiling manually
    #![allow(dead_code)]
    tonic::include_proto!("telemetry");
}

use emma_telemetry::dashboard_client::DashboardClient;
use emma_telemetry::{StateMutation, MemoryRequest};

/// Spawns a background worker to connect to the Linux Core via gRPC
pub async fn start_grpc_telemetry(app_handle: AppHandle, mut rx: tokio::sync::mpsc::Receiver<StateMutation>) {
    let edge_ip = std::env::var("LINUX_EDGE_IP").unwrap_or_else(|_| "127.0.0.1".to_string());
    
    let app_handle_cog = app_handle.clone();
    let app_handle_mem = app_handle.clone();
    let edge_url_cog = format!("http://{}:50051", edge_ip);
    let edge_url_mem = format!("http://{}:50052", edge_ip);

    // 1. Cognitive Telemetry Task (Port 50051)
    tokio::spawn(async move {
        println!("[gRPC] Attempting to connect to E.M.M.A. core at {}...", edge_url_cog);
        if let Ok(mut client) = DashboardClient::connect(edge_url_cog.clone()).await {
            println!("[gRPC] Connected to Linux Core at {}.", edge_url_cog);

            let outbound = ReceiverStream::new(rx);

            if let Ok(response) = client.stream_cognitive_telemetry(Request::new(outbound)).await {
                let mut inbound = response.into_inner();

                while let Some(result) = inbound.next().await {
                    match result {
                        Ok(telemetry_packet) => {
                            // Struct matches what React UI expects: { type: "MOE_ROUTING_UPDATE", payload: {...} }
                            #[derive(serde::Serialize, Clone)]
                            struct MoePayload {
                                active_experts: Vec<i32>,
                                rosais_alert: bool,
                            }
                            
                            let payload = MoePayload {
                                active_experts: telemetry_packet.active_nodes,
                                rosais_alert: telemetry_packet.trn_gating_status,
                            };
                            
                            // Emit straight to the React Dashboard
                            let _ = app_handle_cog.emit_all("moe_telemetry", payload);
                        }
                        Err(e) => {
                            eprintln!("[gRPC] Cognitive telemetry stream broken: {}", e);
                            break;
                        }
                    }
                }
            }
        } else {
            eprintln!("[gRPC] Cognitive telemetry failed to connect at {}. Running offline.", edge_url_cog);
        }
    });

    // 2. Memory Vectors Task (Port 50052)
    tokio::spawn(async move {
        println!("[gRPC-Weaviate] Attempting to connect to Memory Bridge at {}...", edge_url_mem);
        if let Ok(mut client) = DashboardClient::connect(edge_url_mem.clone()).await {
            println!("[gRPC-Weaviate] Connected to Memory Bridge at {}.", edge_url_mem);

            let request = Request::new(MemoryRequest {
                filter: "ACTIVE_SPINDLE".to_string(),
            });

            if let Ok(response) = client.stream_memory_vectors(request).await {
                let mut inbound = response.into_inner();

                #[derive(serde::Serialize, Clone)]
                struct MemPayload {
                    x: f32,
                    y: f32,
                    z: f32,
                    decay_status: bool,
                    cluster_id: String,
                }

                let mut buffer: Vec<MemPayload> = Vec::new();

                loop {
                    match tokio::time::timeout(std::time::Duration::from_millis(500), inbound.next()).await {
                        Ok(Some(Ok(memory_vector))) => {
                            let payload = MemPayload {
                                x: memory_vector.x,
                                y: memory_vector.y,
                                z: memory_vector.z,
                                decay_status: memory_vector.decay_status,
                                cluster_id: memory_vector.cluster_id,
                            };
                            
                            buffer.push(payload);

                            if buffer.len() >= 50 {
                                let _ = app_handle_mem.emit_all("memory_telemetry", &buffer);
                                buffer.clear();
                            }
                        }
                        Ok(Some(Err(e))) => {
                            eprintln!("[gRPC-Weaviate] Memory telemetry stream broken: {}", e);
                            break;
                        }
                        Ok(None) => {
                            if !buffer.is_empty() {
                                let _ = app_handle_mem.emit_all("memory_telemetry", &buffer);
                                buffer.clear();
                            }
                            break;
                        }
                        Err(_) => {
                            // Timeout elapsed
                            if !buffer.is_empty() {
                                let _ = app_handle_mem.emit_all("memory_telemetry", &buffer);
                                buffer.clear();
                            }
                        }
                    }
                }
            }
        } else {
            eprintln!("[gRPC-Weaviate] Memory telemetry failed to connect at {}.", edge_url_mem);
        }
    });
}
