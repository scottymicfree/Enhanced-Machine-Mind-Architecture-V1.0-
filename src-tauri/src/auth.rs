use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use sha2::{Digest, Sha256};
use rand::RngCore;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use keyring::Entry;

pub struct PkceSession {
    pub verifier: String,
    pub challenge: String,
}

impl PkceSession {
    pub fn new() -> Self {
        let mut entropy = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut entropy);
        let verifier = URL_SAFE_NO_PAD.encode(entropy);
        
        let mut hasher = Sha256::new();
        hasher.update(verifier.as_bytes());
        let hash = hasher.finalize();
        let challenge = URL_SAFE_NO_PAD.encode(hash);

        Self { verifier, challenge }
    }
}

pub async fn run_pkce_oauth_loop(
    client_id: &str,
    client_secret: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let session = PkceSession::new();
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
        client_id={}&\
        redirect_uri=http://127.0.0.1:8123/oauth/callback&\
        response_type=code&\
        scope=https://www.googleapis.com/auth/drive.readonly%20https://www.googleapis.com/auth/calendar.readonly&\
        code_challenge={}&\
        code_challenge_method=S256",
        client_id, session.challenge
    );

    // Launch default browser safely
    let _ = open::that(&auth_url);

    // Spin up standard temporary loopback callback socket
    let listener = TcpListener::bind("127.0.0.1:8123")?;
    let mut auth_code = String::new();

    for stream in listener.incoming() {
        let mut stream = stream?;
        let mut reader = BufReader::new(&stream);
        let mut first_line = String::new();
        reader.read_line(&mut first_line)?;

        // Isolate query variables
        if let Some(code_start) = first_line.find("code=") {
            let temp_slice = &first_line[code_start + 5..];
            let code_end = temp_slice.find(' ').unwrap_or(temp_slice.len());
            auth_code = temp_slice[..code_end].to_string();
        }

        let response_body = "<html><body><h1>E.M.M.A. Identity Verification Successful. You can close this tab.</h1></body></html>";
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n{}",
            response_body.len(),
            response_body
        );
        stream.write_all(response.as_bytes())?;
        stream.flush()?;
        break; // Drop callback loop instantly
    }

    if auth_code.is_empty() {
        return Err("Auth code missing in loopback callback.".into());
    }

    // Exchange auth code + verifier for production API token
    let client = reqwest::Client::new();
    let exchange_res = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("code", &auth_code),
            ("code_verifier", &session.verifier),
            ("redirect_uri", "http://127.0.0.1:8123/oauth/callback"),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await?;

    if !exchange_res.status().is_success() {
        return Err(format!("Google server token exchange failed: {}", exchange_res.text().await?).into());
    }

    let token_payload: serde_json::Value = exchange_res.json().await?;
    let access_token = token_payload["access_token"].as_str().ok_or("No access token in payload")?;

    // Commit secrets securely into system DPAPI Keyring
    let entry = Entry::new("emma_sovereign_identity", "operator")?;
    entry.set_password(access_token)?;

    println!("[AUTH] OAuth Token secured in DPAPI Keyring successfully.");
    Ok(())
}
