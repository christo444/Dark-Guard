from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import (
    PredictRequest,
    PredictResponse,
    ImagePredictRequest,
    ImagePredictResponse,
    BatchImagePredictRequest,
    BatchImagePredictResponse,
    CountdownVerifyRequest,
    CountdownVerifyResponse,
    BatchCountdownVerifyRequest,
    BatchCountdownVerifyResponse,
    LogDetectionsRequest,
    ReviewDetectionRequest,
    DetectionRecord,
    DatabaseStatsResponse,
)
from services.predictor import PredictorService
# pyrefly: ignore [missing-import]
from services.countdown_service import CountdownVerifierService
from services.db_service import DatabaseService

app = FastAPI(
    title="DarkGuard API",
    description="Backend API for DarkGuard Chrome Extension",
    version="1.0.0"
)

# Allow CORS for the Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor_service = PredictorService()
countdown_service = CountdownVerifierService()
db_service = DatabaseService()

@app.get("/")
def read_root():
    return {
        "message": (
            "Welcome to DarkGuard API. POST to /predict for text, "
            "/predict-image for images, /verify-countdown for countdown timers."
        )
    }

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    if not request.texts:
        raise HTTPException(status_code=422, detail="The 'texts' array cannot be empty.")
    
    try:
        results = predictor_service.process_texts(request.texts)
        # Automatically log positive dark pattern detections
        for r in results:
            if r.is_dark_pattern:
                try:
                    db_service.log_detection(
                        candidate_text=r.candidate_text,
                        category=r.category,
                        confidence=r.confidence,
                        source_type="text",
                        context=r.context
                    )
                except Exception as log_err:
                    print(f"Warning: Failed to auto-log text detection: {log_err}")
        return PredictResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-image", response_model=ImagePredictResponse)
def predict_image(request: ImagePredictRequest):
    if not request.image:
        raise HTTPException(status_code=422, detail="The 'image' field cannot be empty.")
    
    try:
        result = predictor_service.process_image(request.image, request.image_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-images", response_model=BatchImagePredictResponse)
def predict_images(request: BatchImagePredictRequest):
    if not request.images:
        raise HTTPException(status_code=422, detail="The 'images' list cannot be empty.")
    
    try:
        results = predictor_service.process_images(request.images)
        for res in results:
            if res.has_dark_pattern:
                for d in res.detections:
                    if d.is_dark_pattern:
                        try:
                            db_service.log_detection(
                                candidate_text=d.text,
                                category=d.category,
                                confidence=d.confidence,
                                source_type="image",
                                context=f"Image ID: {res.image_id}"
                            )
                        except Exception as log_err:
                            print(f"Warning: Failed to auto-log image detection: {log_err}")
        return BatchImagePredictResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify-countdown", response_model=CountdownVerifyResponse)
def verify_countdown(request: CountdownVerifyRequest):
    if not request.element_selector:
        raise HTTPException(status_code=422, detail="The 'element_selector' field cannot be empty.")

    try:
        res = countdown_service.verify(request)
        if res.is_dark_pattern:
            try:
                db_service.log_detection(
                    candidate_text=request.element_text_sample or request.element_selector,
                    category=res.category,
                    confidence=res.confidence,
                    source_type="countdown",
                    context=f"Selector: {request.element_selector}",
                    page_url=request.page_url
                )
            except Exception as log_err:
                print(f"Warning: Failed to auto-log countdown detection: {log_err}")
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify-countdowns", response_model=BatchCountdownVerifyResponse)
def verify_countdowns(request: BatchCountdownVerifyRequest):
    if not request.countdowns:
        raise HTTPException(status_code=422, detail="The 'countdowns' list cannot be empty.")

    try:
        results = countdown_service.verify_batch(request.countdowns)
        for idx, res in enumerate(results):
            if res.is_dark_pattern:
                req_item = request.countdowns[idx] if idx < len(request.countdowns) else None
                try:
                    db_service.log_detection(
                        candidate_text=(req_item.element_text_sample if req_item else res.element_selector) or res.element_selector,
                        category=res.category,
                        confidence=res.confidence,
                        source_type="countdown",
                        context=f"Selector: {res.element_selector}",
                        page_url=req_item.page_url if req_item else None
                    )
                except Exception as log_err:
                    print(f"Warning: Failed to auto-log countdown batch detection: {log_err}")
        return BatchCountdownVerifyResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================================
# Database & Model Retraining Management Endpoints
# ==================================================================

@app.post("/database/log")
def log_detections(request: LogDetectionsRequest):
    """
    Explicit endpoint for the extension or clients to log detected dark patterns with full page context.
    """
    try:
        raw_items = [item.model_dump() for item in request.detections]
        count = db_service.log_detections_batch(
            page_url=request.page_url,
            domain=request.domain,
            detections=raw_items
        )
        return {"success": True, "logged_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/database/detections", response_model=List[DetectionRecord])
def get_detections(
    review_status: Optional[str] = Query(None, description="Filter by review status: unreviewed, confirmed, false_positive"),
    category: Optional[str] = Query(None, description="Filter by dark pattern category"),
    domain: Optional[str] = Query(None, description="Filter by domain keyword"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """
    Retrieves stored detection records with optional filters.
    """
    try:
        records = db_service.get_detections(
            review_status=review_status,
            category=category,
            domain=domain,
            limit=limit,
            offset=offset
        )
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/database/detections/{detection_id}/review")
def review_detection(detection_id: int, request: ReviewDetectionRequest):
    """
    Marks a detection as 'confirmed' or 'false_positive' with ground-truth correction label.
    Used for curation and future model fine-tuning.
    """
    try:
        success = db_service.review_detection(
            detection_id=detection_id,
            review_status=request.review_status,
            corrected_label=request.corrected_label,
            reviewer_notes=request.reviewer_notes
        )
        if not success:
            raise HTTPException(status_code=404, detail=f"Detection record ID {detection_id} not found.")
        return {
            "success": True,
            "message": f"Detection {detection_id} marked as {request.review_status}."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/database/stats", response_model=DatabaseStatsResponse)
def get_database_stats():
    """
    Returns summary statistics, category counts, and false positive metrics.
    """
    try:
        return db_service.get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/database/export-dataset")
def export_dataset(status_filter: Optional[str] = Query(None, description="Filter export by: confirmed, false_positive, unreviewed")):
    """
    Exports all labeled detections in ready-to-train format for BERT/RoBERTa fine-tuning.
    """
    try:
        dataset = db_service.export_dataset_for_training(status_filter=status_filter)
        return {
            "total_samples": len(dataset),
            "export_timestamp": db_service.get_stats(),
            "data": dataset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard", response_class=HTMLResponse)
def database_dashboard():
    """
    Renders an interactive HTML dashboard displaying all database records in a responsive table.
    """
    stats = db_service.get_stats()
    records = db_service.get_detections(limit=300)

    rows_html = ""
    for r in records:
        status = r["review_status"]
        if status == "false_positive":
            status_badge = '<span class="badge badge-danger">False Positive</span>'
        elif status == "confirmed":
            status_badge = '<span class="badge badge-success">Confirmed</span>'
        else:
            status_badge = '<span class="badge badge-warning">Unreviewed</span>'

        src_icon = "🔤" if r["source_type"] == "text" else ("🖼️" if r["source_type"] == "image" else "⏱️")
        conf_pct = f"{r['confidence'] * 100:.1f}%"
        cand_text = (r["candidate_text"] or "").replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')
        context_text = (r["context"] or "").replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')

        rows_html += f"""
        <tr id="row-{r['id']}">
            <td><strong>#{r['id']}</strong></td>
            <td>
                <div class="pattern-text">"{cand_text}"</div>
                {f'<div class="context-subtext">Context: {context_text[:120]}...</div>' if context_text and context_text != cand_text else ''}
            </td>
            <td><span class="cat-pill">{r['category']}</span></td>
            <td><span class="source-tag">{src_icon} {r['source_type'].capitalize()}</span></td>
            <td><strong>{conf_pct}</strong></td>
            <td id="status-{r['id']}">{status_badge}</td>
            <td class="action-cell">
                <button class="btn btn-sm btn-fp" onclick="markRecord({r['id']}, 'false_positive')" title="Mark as False Positive for Retraining">❌ Flag FP</button>
                <button class="btn btn-sm btn-conf" onclick="markRecord({r['id']}, 'confirmed')" title="Confirm as True Dark Pattern">✓ Confirm</button>
            </td>
        </tr>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dark-Guard Database Table Dashboard</title>
        <style>
            * {{ box-sizing: border-box; margin: 0; padding: 0; }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #0b0f19;
                color: #e2e8f0;
                padding: 28px;
            }}
            .header {{
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 1px solid #1e293b;
            }}
            .title-area h1 {{ font-size: 24px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 10px; }}
            .title-area p {{ font-size: 13px; color: #94a3b8; margin-top: 4px; }}
            .stats-bar {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }}
            .stat-card {{
                background: #131b2e;
                border: 1px solid #1e293b;
                border-radius: 10px;
                padding: 16px 20px;
            }}
            .stat-val {{ font-size: 26px; font-weight: 800; color: #ffffff; }}
            .stat-lbl {{ font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-top: 2px; }}
            .stat-blue {{ color: #38bdf8; }}
            .stat-yellow {{ color: #f59e0b; }}
            .stat-green {{ color: #10b981; }}
            .stat-red {{ color: #ef4444; }}

            .toolbar {{
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
                gap: 12px;
            }}
            .search-box {{
                background: #131b2e;
                border: 1px solid #1e293b;
                color: #ffffff;
                padding: 10px 16px;
                border-radius: 8px;
                width: 320px;
                font-size: 14px;
                outline: none;
            }}
            .search-box:focus {{ border-color: #38bdf8; }}

            .table-container {{
                background: #131b2e;
                border: 1px solid #1e293b;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                text-align: left;
                font-size: 13px;
            }}
            th {{
                background: #0f172a;
                padding: 14px 16px;
                color: #94a3b8;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                border-bottom: 1px solid #1e293b;
            }}
            td {{
                padding: 14px 16px;
                border-bottom: 1px solid #1a243b;
                vertical-align: middle;
            }}
            tr:hover td {{ background: #18223a; }}
            .pattern-text {{ font-weight: 600; color: #f1f5f9; line-height: 1.4; max-width: 480px; }}
            .context-subtext {{ font-size: 11px; color: #64748b; margin-top: 4px; }}
            .cat-pill {{
                background: #1e293b;
                border: 1px solid #334155;
                color: #f8fafc;
                padding: 4px 10px;
                border-radius: 6px;
                font-weight: 600;
                font-size: 12px;
                white-space: nowrap;
            }}
            .source-tag {{ font-size: 12px; color: #94a3b8; white-space: nowrap; }}
            .badge {{
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.3px;
                white-space: nowrap;
            }}
            .badge-warning {{ background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }}
            .badge-success {{ background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }}
            .badge-danger {{ background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }}
            
            .btn {{
                background: #2563eb;
                color: white;
                border: none;
                padding: 9px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 13px;
                transition: all 0.2s;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }}
            .btn:hover {{ opacity: 0.9; }}
            .btn-sm {{ padding: 5px 10px; font-size: 11px; border-radius: 5px; }}
            .btn-fp {{ background: transparent; border: 1px solid #ef4444; color: #ef4444; }}
            .btn-fp:hover {{ background: #ef4444; color: white; }}
            .btn-conf {{ background: transparent; border: 1px solid #10b981; color: #10b981; margin-left: 4px; }}
            .btn-conf:hover {{ background: #10b981; color: white; }}
            .action-cell {{ white-space: nowrap; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title-area">
                <h1>🛡️ Dark-Guard Database Table</h1>
                <p>Curated detection audit log & human-in-the-loop false positive discovery engine</p>
            </div>
            <div style="display:flex; gap: 10px;">
                <a href="/database/export-dataset" target="_blank" class="btn">📥 Export Training JSON</a>
                <button onclick="location.reload()" class="btn" style="background:#334155;">🔄 Refresh Table</button>
            </div>
        </div>

        <div class="stats-bar">
            <div class="stat-card">
                <div class="stat-val stat-blue">{stats['total_detections']}</div>
                <div class="stat-lbl">Total Detections</div>
            </div>
            <div class="stat-card">
                <div class="stat-val stat-yellow">{stats['unreviewed_count']}</div>
                <div class="stat-lbl">Unreviewed</div>
            </div>
            <div class="stat-card">
                <div class="stat-val stat-green">{stats['confirmed_count']}</div>
                <div class="stat-lbl">Confirmed Patterns</div>
            </div>
            <div class="stat-card">
                <div class="stat-val stat-red">{stats['false_positive_count']}</div>
                <div class="stat-lbl">False Positives</div>
            </div>
        </div>

        <div class="toolbar">
            <input type="text" id="searchInput" class="search-box" placeholder="Filter by text, category, or source..." onkeyup="filterTable()">
            <div style="font-size:12px; color:#64748b;">Showing live rows from <code>backend/darkguard.db</code></div>
        </div>

        <div class="table-container">
            <table id="dataTable">
                <thead>
                    <tr>
                        <th style="width: 70px;">ID</th>
                        <th>Candidate Text / Context</th>
                        <th style="width: 140px;">Category</th>
                        <th style="width: 110px;">Source</th>
                        <th style="width: 100px;">Confidence</th>
                        <th style="width: 130px;">Review Status</th>
                        <th style="width: 170px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html if rows_html else '<tr><td colspan="7" style="text-align:center; padding: 40px; color:#64748b;">No detections recorded yet. Visit the test store with the extension to log dark patterns.</td></tr>'}
                </tbody>
            </table>
        </div>

        <script>
            function markRecord(id, status) {{
                const label = status === 'false_positive' ? 'Not Dark Pattern' : null;
                fetch(`/database/detections/${{id}}/review`, {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ review_status: status, corrected_label: label, reviewer_notes: 'Marked via Dashboard Table' }})
                }})
                .then(r => r.json())
                .then(res => {{
                    if (res.success) {{
                        const cell = document.getElementById(`status-${{id}}`);
                        if (status === 'false_positive') {{
                            cell.innerHTML = '<span class="badge badge-danger">False Positive</span>';
                        }} else {{
                            cell.innerHTML = '<span class="badge badge-success">Confirmed</span>';
                        }}
                    }}
                }});
            }}

            function filterTable() {{
                const input = document.getElementById('searchInput');
                const filter = input.value.toLowerCase();
                const table = document.getElementById('dataTable');
                const tr = table.getElementsByTagName('tr');

                for (let i = 1; i < tr.length; i++) {{
                    const text = tr[i].textContent || tr[i].innerText;
                    tr[i].style.display = text.toLowerCase().indexOf(filter) > -1 ? '' : 'none';
                }}
            }}
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)