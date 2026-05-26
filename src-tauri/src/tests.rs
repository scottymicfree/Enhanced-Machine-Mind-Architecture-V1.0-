#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;
    use serde_json::json;

    #[tokio::test]
    async fn test_hardware_payload_serialization() {
        let payload = HardwarePayload {
            vram_fragmentation: 12.3,
            nvlink_bandwidth: 1024.5,
            power_draw: 150.0,
            system_load: 45.5,
            mem_usage_percent: 65.0,
            gpu_detected: true,
        };

        let json_value = serde_json::to_value(&payload).expect("Failed to serialize HardwarePayload");
        assert_eq!(json_value["gpu_detected"], true);
        assert_eq!(json_value["mem_usage_percent"], 65.0);
        assert_eq!(json_value["vram_fragmentation"], 12.3);
    }

    #[tokio::test]
    async fn test_gaze_payload_deserialization() {
        let json_str = r#"{"x": 100.5, "y": 200.5, "smoothed": true}"#;
        let payload: GazePayload = serde_json::from_str(json_str).expect("Failed to deserialize GazePayload");
        
        assert_eq!(payload.x, 100.5);
        assert_eq!(payload.y, 200.5);
        assert_eq!(payload.smoothed, true);
    }

    #[tokio::test]
    async fn test_grpc_channel_mutation() {
        // Test the channel that bridges the frontend React commands to the gRPC stream
        let (tx, mut rx) = mpsc::channel::<grpc::emma_telemetry::StateMutation>(32);
        
        let state = AppState {
            mutation_sender: tokio::sync::Mutex::new(Some(tx)),
        };

        // Simulate what the send_mutation Tauri command does
        let sender_guard = state.mutation_sender.lock().await;
        assert!(sender_guard.is_some());
        
        if let Some(sender) = sender_guard.as_ref() {
            let mutation = grpc::emma_telemetry::StateMutation {
                command: "INITIATE_LOCKDOWN".to_string(),
                override_type: "MANUAL".to_string(),
            };
            let result = sender.send(mutation).await;
            assert!(result.is_ok(), "Failed to send mutation through channel");
        }
        drop(sender_guard); // Drop the guard so rx can receive

        // Verify the stream consumer (gRPC client) would receive it
        let received = rx.recv().await.expect("Failed to receive mutation");
        assert_eq!(received.command, "INITIATE_LOCKDOWN");
        assert_eq!(received.override_type, "MANUAL");
    }
}
