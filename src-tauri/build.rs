// build.rs
fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Compiles our strongly-typed master telemetry contracts directly during Tauri build pipeline
    tonic_build::compile_protos("../proto/telemetry.proto")?;
    Ok(())
}
