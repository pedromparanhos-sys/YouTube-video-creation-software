"""Frame local service.

Runs next to the editor (http://localhost:8765) and does the work a browser can't:
- renders Manim scenes to video
- converts the editor's WebM export to MP4 (H.264) with FFmpeg

Start it with:  python -m uvicorn server.main:app --port 8765
"""

from __future__ import annotations

import asyncio
import json
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
MEDIA = ROOT / "media"
MEDIA.mkdir(exist_ok=True)

app = FastAPI(title="Frame local service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

QUALITY = {
    # flag, width, height
    "preview": ("-ql", 854, 480),
    "hd": ("-qm", 1280, 720),
    "full": ("-qh", 1920, 1080),
}

# One render at a time keeps the machine responsive and the logs readable.
render_lock = asyncio.Lock()


def manim_available() -> bool:
    try:
        import manim  # noqa: F401

        return True
    except Exception:
        return False


def ffmpeg_path() -> str | None:
    return shutil.which("ffmpeg")


def probe_duration(path: Path) -> float | None:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return None
    out = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
        capture_output=True,
        text=True,
    )
    try:
        return float(json.loads(out.stdout)["format"]["duration"])
    except Exception:
        return None


@app.get("/health")
def health():
    version = None
    if manim_available():
        import manim

        version = manim.__version__
    return {
        "ok": True,
        "manim": version,
        "ffmpeg": ffmpeg_path() is not None,
        "python": sys.version.split()[0],
    }


class ManimRequest(BaseModel):
    code: str = Field(..., description="Python source with at least one Scene subclass")
    scene: str | None = Field(None, description="Scene class name; defaults to the last Scene in the file")
    quality: str = Field("preview", pattern="^(preview|hd|full)$")
    aspect: float = Field(16 / 9, gt=0.2, lt=5, description="width / height of the frame")


SCENE_RE = re.compile(r"^class\s+(\w+)\s*\(([^)]*Scene[^)]*)\)\s*:", re.M)


@app.post("/manim/render")
async def render_manim(req: ManimRequest):
    if not manim_available():
        raise HTTPException(503, "Manim não está instalado no serviço local.")

    scenes = [m.group(1) for m in SCENE_RE.finditer(req.code)]
    scene = req.scene or (scenes[-1] if scenes else None)
    if not scene:
        raise HTTPException(400, "Nenhuma classe Scene encontrada no código (ex.: class Cena(Scene): ...).")

    flag, base_w, base_h = QUALITY[req.quality]
    # keep the frame's aspect: fix the height, derive the width (both even for H.264)
    height = base_h
    width = int(round(height * req.aspect / 2) * 2)

    job = uuid.uuid4().hex[:12]
    async with render_lock:
        with tempfile.TemporaryDirectory(prefix="frame-manim-") as tmp:
            tmpdir = Path(tmp)
            src = tmpdir / "scene.py"
            src.write_text(req.code, encoding="utf-8")
            cmd = [
                sys.executable, "-m", "manim", "render", flag,
                "--disable_caching",
                "-r", f"{width},{height}",
                "--media_dir", str(tmpdir / "media"),
                "-o", f"{job}.mp4",
                str(src), scene,
            ]
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=tmp,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
            try:
                out, _ = await asyncio.wait_for(proc.communicate(), timeout=600)
            except asyncio.TimeoutError:
                proc.kill()
                raise HTTPException(504, "A renderização passou de 10 minutos e foi interrompida.")
            log = out.decode("utf-8", "replace")
            found = list((tmpdir / "media").rglob(f"{job}.mp4"))
            if proc.returncode != 0 or not found:
                raise HTTPException(422, {"message": "O Manim falhou ao renderizar a cena.", "log": tail(log)})
            dest = MEDIA / f"{job}.mp4"
            shutil.move(str(found[0]), dest)

    return {
        "id": job,
        "scene": scene,
        "url": f"/media/{job}.mp4",
        "duration": probe_duration(dest),
        "width": width,
        "height": height,
        "log": tail(log, 20),
    }


@app.post("/export/mp4")
async def export_mp4(file: UploadFile = File(...)):
    ff = ffmpeg_path()
    if not ff:
        raise HTTPException(503, "FFmpeg não encontrado no serviço local.")
    job = uuid.uuid4().hex[:12]
    src = MEDIA / f"{job}.webm"
    dest = MEDIA / f"{job}.mp4"
    with src.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)
    proc = await asyncio.create_subprocess_exec(
        ff, "-y", "-i", str(src),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-r", "30", "-movflags", "+faststart", "-an",
        str(dest),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    out, _ = await proc.communicate()
    src.unlink(missing_ok=True)
    if proc.returncode != 0:
        raise HTTPException(422, {"message": "O FFmpeg falhou ao converter o vídeo.", "log": tail(out.decode("utf-8", "replace"))})
    return {"id": job, "url": f"/media/{job}.mp4"}


@app.get("/media/{name}")
def media(name: str):
    if not re.fullmatch(r"[0-9a-f]{12}\.(mp4|webm)", name):
        raise HTTPException(404)
    path = MEDIA / name
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path, media_type="video/mp4" if name.endswith(".mp4") else "video/webm")


def tail(text: str, lines: int = 40) -> str:
    return "\n".join(text.strip().splitlines()[-lines:])
