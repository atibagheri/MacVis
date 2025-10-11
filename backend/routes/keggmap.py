# backend/routes/keggmap.py
from flask import Blueprint, request, jsonify
import os, tempfile, requests, shutil
from werkzeug.utils import secure_filename

keggmap_blueprint = Blueprint("keggmap", __name__)
PLUMBER_URL = os.getenv("KEGGMAP_PLUMBER_URL", "http://localhost:8000/keggmap")
REQUEST_TIMEOUT = (10, 300)

ALLOWED_MODES = {"genelist", "genelist_fc"}
ALLOWED_SPECIES = {"mouse", "human"}

@keggmap_blueprint.route("", methods=["POST"])
def run_keggmap():
    mode = (request.form.get("mode") or "").strip()
    species = (request.form.get("species") or "").strip()
    file = request.files.get("file")

    if not file or mode not in ALLOWED_MODES or species not in ALLOWED_SPECIES:
        return jsonify({"success": False, "error": "Missing/invalid file, mode or species"}), 400

    temp_dir = tempfile.mkdtemp(prefix="kegg_")
    try:
        filename = secure_filename(file.filename) or "upload.txt"
        input_path = os.path.abspath(os.path.join(temp_dir, filename))
        file.save(input_path)

        payload = {"mode": mode, "species": species, "file_path": input_path}
        r = requests.post(PLUMBER_URL, json=payload, timeout=REQUEST_TIMEOUT)

        try:
            data = r.json()
        except ValueError:
            return jsonify({"success": False, "error": r.text or "Non-JSON from KEGG service"}), 502

        if r.status_code != 200 or not data.get("success"):
            return jsonify({"success": False, "error": data.get("error", "KEGG error"), "details": data}), 502

        # ✅ Pass through base64 payloads (zip_base64, maps, etc.)
        return jsonify(data), 200
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
