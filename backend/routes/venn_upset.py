from flask import Blueprint, request, jsonify
import os
import requests
import json
import tempfile

# ✅ Blueprint name must match what you import in app.py
venn_upset_blueprint = Blueprint("venn_upset", __name__)
PLUMBER_URL = os.getenv("VENNUPSET_PLUMBER_URL", "http://localhost:8000/venn-upset")




@venn_upset_blueprint.route("", methods=["POST"])
def venn_upset():
    print("✅ Incoming request to /api/venn-upset")
    print("🔎 DEBUG: request.form:", request.form)
    print("🔎 DEBUG: request.files:", request.files)

    try:
        file_storages = request.files.getlist("files")
        print(f"📂 Number of files received: {len(file_storages)}")

        if len(file_storages) < 2:
            print("❌ ERROR: Less than 2 files uploaded.")
            return jsonify({"error": "Please upload at least 2 files"}), 400

        saved_paths = []
        for file in file_storages:
            temp_dir = tempfile.gettempdir()
            save_path = os.path.join(temp_dir, file.filename)
            file.save(save_path)
            saved_paths.append(save_path)
            print(f"✅ Saved file: {save_path}")

        print("📄 All saved paths:", saved_paths)

        # ✅ Send JSON to Plumber
        headers = {"Content-Type": "application/json"}
        payload = {"paths": saved_paths}
        print(f"📤 Sending POST to Plumber at {PLUMBER_URL}")
        print(json.dumps(payload, indent=2))

        r = requests.post(PLUMBER_URL, headers=headers, json=payload)
        print(f"📥 Plumber responded with status code: {r.status_code}")

        if r.status_code == 200:
            response_json = r.json()
            # 👇 Debug keys
            print("🔎 DEBUG: plumber response_json keys:", response_json.keys())
            result = {
                "png": response_json.get("png_base64"),
                "pdf": response_json.get("pdf_base64")
            }
            print("✅ Returning both PNG and PDF base64 to frontend")
            return jsonify(result)
        else:
            print("❌ Plumber returned non-200")
            print("❌ Status Code:", r.status_code)
            print("❌ Response text:", r.text)
            return jsonify({"error": "Plumber error", "details": r.text}), r.status_code

    except Exception as e:
        print("❌ Unexpected error:", str(e))
        return jsonify({"error": str(e)}), 500
