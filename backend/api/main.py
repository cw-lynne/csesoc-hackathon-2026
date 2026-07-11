import sys
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# backend/main holds the CSV/processing pipeline (parse.py, score.py, ...);
# it isn't a package, so add it to the path to import from it.
sys.path.append(str(Path(__file__).resolve().parent.parent / "main"))
from parse import parse_csv  # noqa: E402
from score import analyze_bom  # noqa: E402

app = FastAPI(title="ecocompass API")

# The frontend reaches us through Vite's /api proxy (same-origin in dev), but
# allow direct localhost calls too so the app works without the proxy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    """Health check + endpoint index."""
    return {"service": "ecocompass", "status": "ok", "endpoints": ["/upload-csv", "/analyze-bom"]}


@app.post("/analyze-bom")
def analyze_bom_endpoint(payload: dict = Body(...)):
    """Run the swap analysis for a bill of materials.

    Body: { "bom": [{ "component", "from", "kg", "req"? }, ...],
            "weights": { "carbon": 0..1 } }
    Returns { "weights", "lines", "summary" } — the shape the frontend renders.
    """
    bom = payload.get("bom")
    if not isinstance(bom, list) or not bom:
        raise HTTPException(status_code=400, detail="Request must include a non-empty 'bom' array.")
    weights = payload.get("weights") or {"carbon": 0.6}
    try:
        return analyze_bom(bom, weights)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Unknown material in BOM: {e}")


@app.post("/upload-csv")
async def upload_csv(file: UploadFile):
    """Accept an uploaded CSV file and convert it into rows for backend processing."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Could not decode file as UTF-8.")

    rows = parse_csv(text)
    return {"filename": file.filename, "row_count": len(rows), "rows": rows}