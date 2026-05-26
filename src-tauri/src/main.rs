#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tokio::sync::mpsc;
use tokio::net::UdpSocket;
use std::sync::Arc;
use tauri::State;
use serde_json::Value;

// Prost compilation of telemetry.proto occurs in build-step
pub mod emma_telemetry {
    tonic::include_proto!("telemetry");
}

pub mod auth;

use emma_telemetry::dashboard_client::DashboardClient;
use emma_telemetry::StateMutation;

pub struct AppState {
    pub mutation_tx: mpsc::Sender<StateMutation>,
}

#[tauri::command]
async fn send_mutation(intent: String, state: State<'_, AppState>) -> Result<(), String> {
    let payload = StateMutation {
        target_module: "CORE".to_string(),
        action_command: intent,
        parameters: None,
        authorized_user_id: "VERIFIED_OPERATOR".to_string(),
    };

    state.mutation_tx.send(payload).await
        .map_err(|e| format!("Failed to route mutation downstream: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn initiate_oauth() -> Result<(), String> {
    let client_id = std::env::var("GOOGLE_CLIENT_ID")
        .map_err(|_| "GOOGLE_CLIENT_ID env parameter is missing".to_string())?;
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET")
        .map_err(|_| "GOOGLE_CLIENT_SECRET env parameter is missing".to_string())?;

    auth::run_pkce_oauth_loop(&client_id, &client_secret).await
        .map_err(|e| format!("OAuth PKCE workflow failure: {}", e))?;
    
    Ok(())
}

fn main() {
    // Inject dynamic configurations at runtime
    dotenvy::dotenv().ok();
    let edge_ip = std::env::var("LINUX_EDGE_IP").unwrap_or_else(|_| "127.0.0.1".to_string());
    let grpc_url = format!("http://{}:50051", edge_ip);

    // Command communication channel
    let (tx, mut rx) = mpsc::channel::<StateMutation>(32);

    tauri::Builder::default()
        .manage(AppState { mutation_tx: tx })
        .setup(move |app| {
            let app_handle = app.handle();

            // Thread 1: Real-time high-speed UDP gaze tracker listener
            let handle_udp = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let socket = UdpSocket::bind("127.0.0.1:8124").await.expect("Failed to bind UDP socket.");
                let mut buf = [0; 1024];
                loop {
                    if let Ok((len, _)) = socket.recv_from(&mut buf).await {
                        if let Ok(json_data) = std::str::from_utf8(&buf[..len]) {
                            if let Ok(parsed) = serde_json::from_str::<Value>(json_data) {
                                // Emit coordinates up to the WebGPU overlay at 60Hz
                                let _ = handle_udp.emit_all("gaze_telemetry", parsed);
                            }
                        }
                    }
                }
            });

            // Thread 2: Persistent gRPC HTTP/2 bi-directional Telemetry Stream
            let handle_grpc = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    match DashboardClient::connect(grpc_url.clone()).await {
                        Ok(mut client) => {
                            // Construct outbound Tonic stream from Channel Receiver
                            let outbound_stream = async_stream::stream! {
                                while let Some(mutation) = rx.recv().await {
                                    yield mutation;
                                }
                            };

                            if let Ok(response) = client.stream_cognitive_telemetry(outbound_stream).await {
                                let mut inbound = response.into_inner();
                                while let Some(Ok(packet)) = inbound.next().await {
                                    // Parse and route to React Zustand store
                                    let _ = handle_grpc.emit_all("moe_telemetry", packet);
                                }
                            }
                        }
                        Err(_) => {
                            // Exponential retry delay on network interruption
                            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![send_mutation, initiate_oauth])
        .run(tauri::generate_context!())
        .expect("Runtime critical error while executing Tauri application.");
}
