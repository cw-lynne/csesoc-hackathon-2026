import importlib.util
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile

# backend/main holds the CSV/processing pipeline (parse.py, score.py, ...);
# it isn't a package, so add it to the path to import from it.
_MAIN_DIR = Path(__file__).resolve().parent.parent / "main"
sys.path.append(str(_MAIN_DIR))
from parse import parse_csv  # noqa: E402

# backend/main/main.py can't be imported as `main` here since uvicorn already
# registers this file (backend/api/main.py) under that module name — load it
# under a distinct name instead to avoid the collision.
_pipeline_spec = importlib.util.spec_from_file_location("bom_pipeline", _MAIN_DIR / "main.py")
bom_pipeline = importlib.util.module_from_spec(_pipeline_spec)
_pipeline_spec.loader.exec_module(bom_pipeline)

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}


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


@app.post("/analyze-csv")
async def analyze_csv(file: UploadFile):
    """Parse an uploaded CSV and return the AI sustainability/recyclability/
    longevity analysis for the frontend."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Could not decode file as UTF-8.")

    rows = parse_csv(text)
    try:
        analysis = bom_pipeline.analyze_with_ai(rows)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {exc}")

    return {"filename": file.filename, "row_count": len(rows), "analysis": analysis}