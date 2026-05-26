# Protobuf Compilation Command (PowerShell/Windows)
# Generates the Python bindings for the Weaviate bridge running locally.
# Rust bindings are automatically managed by `cargo build` thanks to `tonic-build` in build.rs.

# Install required python packages
python -m pip install grpcio grpcio-tools

# Compile the Python bindings
python -m grpc_tools.protoc `
    -I ./src-tauri/proto `
    --python_out=. `
    --grpc_python_out=. `
    ./src-tauri/proto/telemetry.proto
