"""
E.M.M.A. Optical Bridge - Gaze Tracker Module
This runs locally on the Windows Desktop. It utilizes the webcam 
and MediaPipe FaceMesh to compute visual coordinates.

It uses an Exponential Moving Average (EMA) and emits UDP packets
back to the Rust Tauri daemon, skipping heavy WebSocket overhead.
"""

import cv2
import socket
import json
import time

try:
    import mediapipe as mp
except ImportError:
    print("[WARN] MediaPipe missing. Run: pip install opencv-python mediapipe")
    exit(1)

class PredictiveGazeFilter:
    def __init__(self, alpha=0.25):
        self.alpha = alpha 
        self.smoothed_x = None
        self.smoothed_y = None

    def update(self, raw_x, raw_y):
        if self.smoothed_x is None:
            self.smoothed_x, self.smoothed_y = raw_x, raw_y
        else:
            self.smoothed_x = (self.alpha * raw_x) + ((1 - self.alpha) * self.smoothed_x)
            self.smoothed_y = (self.alpha * raw_y) + ((1 - self.alpha) * self.smoothed_y)
        return self.smoothed_x, self.smoothed_y

def main():
    print("[OPTICAL BRIDGE] Initializing MediaPipe FaceMesh...")
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True, min_detection_confidence=0.5)
    
    gaze_filter = PredictiveGazeFilter(alpha=0.3)
    
    # Connect standard Desktop Webcam
    cap = cv2.VideoCapture(0)
    
    # Local UDP Socket targeting Rust Daemon (Port 8124)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    UDP_IP = "127.0.0.1"
    UDP_PORT = 8124
    
    # We calibrate to a generic 100x100 percentage viewport for the UI crosshair
    viewport_w, viewport_h = 100, 100 

    print("[OPTICAL BRIDGE] Emitting temporal vectors via UDP on port 8124...")

    while cap.isOpened():
        success, image = cap.read()
        if not success:
            continue

        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(image_rgb)
        
        if results.multi_face_landmarks:
            for landmarks in results.multi_face_landmarks:
                # Approximate pupils using relative distances of refined landmarks
                left_pupil = landmarks.landmark[468]
                right_pupil = landmarks.landmark[473]
                
                raw_x = ((left_pupil.x + right_pupil.x) / 2.0) * viewport_w
                raw_y = ((left_pupil.y + right_pupil.y) / 2.0) * viewport_h
                
                smooth_x, smooth_y = gaze_filter.update(raw_x, raw_y)
                
                payload = json.dumps({
                    "x": round(smooth_x, 2), 
                    "y": round(smooth_y, 2), 
                    "smoothed": True
                }).encode('utf-8')
                
                # Send via ultra-low latency UDP
                sock.sendto(payload, (UDP_IP, UDP_PORT))
                
        # Optional Cap fps to save CPU
        time.sleep(0.016) # ~60Hz

    cap.release()

if __name__ == "__main__":
    main()
