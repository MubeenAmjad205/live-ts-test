from contextlib import asynccontextmanager
import asyncio
import numpy as np
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import json
from core import logger


# Define local models directory
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-download both models on startup
    logger.info("Pre-downloading/Loading models to local FS...")
    get_model("tiny")
    get_model("base")

    yield
    # Cleanup if needed
    pass

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global models cache
models = {
    "tiny": None,
    "base": None
}

def get_model(model_size: str):
    if models[model_size] is None:
        logger.info(f"Ensuring model: {model_size}.en is available locally...")

        # Point to the local models directory
        models[model_size] = WhisperModel(
            f"{model_size}.en", 
            device="cpu", 
            compute_type="int8",
            download_root=MODELS_DIR
        )
    return models[model_size]

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection accepted")

    
    current_model_size = "tiny" # Default
    model = get_model(current_model_size)
    
    # Audio buffer: 16kHz, float32
    audio_buffer = np.array([], dtype=np.float32)
    
    # State for streaming
    last_transcription = ""
    
    try:
        while True:
            # Receive data (can be JSON config or Binary audio)
            message = await websocket.receive()
            
            if message["type"] == "websocket.disconnect":
                logger.info("Client disconnected gracefully")
                break


            if "text" in message:
                # Handle configuration
                data = json.loads(message["text"])
                if data.get("type") == "config":
                    new_model = data.get("model")
                    if new_model in ["tiny", "base"] and new_model != current_model_size:
                        current_model_size = new_model
                        model = get_model(current_model_size)
                        logger.info(f"Switched model to: {current_model_size}")

                
                if data.get("type") == "clear":
                    audio_buffer = np.array([], dtype=np.float32)
                    last_transcription = ""
                    logger.debug("Transcription buffer cleared")
                    continue


            elif "bytes" in message:
                # Handle binary audio data
                # Expecting PCM Float32 at 16kHz
                chunk = np.frombuffer(message["bytes"], dtype=np.float32)
                audio_buffer = np.append(audio_buffer, chunk)
                
                # Run transcription if we have enough data (at least 0.5s)
                # and we haven't run it too recently (rate limiting for CPU)
                if len(audio_buffer) >= 8000: # 0.5s at 16kHz
                    # For a simple test, we transcribe the last 10 seconds max to keep latency low
                    processing_buffer = audio_buffer[-160000:] # Max 10s
                    
                    # beam_size=1 and other optimizations for speed
                    segments, info = model.transcribe(
                        processing_buffer,
                        beam_size=1,
                        language="en",
                        vad_filter=True,
                        vad_parameters=dict(min_silence_duration_ms=500)
                    )
                    
                    full_text = ""
                    for segment in segments:
                        full_text += segment.text
                    
                    full_text = full_text.strip()
                    
                    if full_text != last_transcription:
                        await websocket.send_json({
                            "type": "transcription",
                            "text": full_text,
                            "is_final": False # In this simple implementation, we just stream partials
                        })
                        last_transcription = full_text

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        # Avoid logging the "Cannot call receive" error as it is redundant during disconnect
        if "disconnect message has been received" not in str(e):
            logger.error(f"Unexpected error: {e}")

        try:
            # Only try to close if we're not already disconnected
            await websocket.close()
        except Exception:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
