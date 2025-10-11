# routes/circos.py
from flask import Blueprint, request, jsonify
import tempfile, os, json, requests

circos_blueprint = Blueprint("circos", __name__)
PLUMBER_URL = os.environ.get("CIRCOS_PLUMBER_URL", "http://localhost:8000/circos")

def _extract_labels_from_form(form, n_files: int):
  # support repeated 'labels' or a single 'labels_json' (JSON array)
  labels = form.getlist("labels")
  if not labels and form.get("labels_json"):
    try:
      labels = json.loads(form.get("labels_json"))
    except Exception:
      labels = []
  if labels and len(labels) == n_files:
    return labels
  return None  # let R derive

@circos_blueprint.route("", methods=["POST"])
def circos():
  try:
    files = request.files.getlist("files")
    if len(files) < 2:
      return jsonify({"error": "Please upload at least 2 files"}), 400

    gene_col_user = request.form.get("gene_col_user") or None
    min_shared = int(request.form.get("min_shared", "1"))
    labels = _extract_labels_from_form(request.form, len(files))

    # save uploads to unique temp files; delete after request
    temp_paths = []
    try:
      for f in files:
        suffix = os.path.splitext(f.filename or "")[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
          f.stream.seek(0)
          tmp.write(f.read())
          temp_paths.append(tmp.name)

      payload = {"paths": temp_paths, "gene_col_user": gene_col_user, "min_shared": min_shared}
      if labels:
        payload["labels"] = labels

      r = requests.post(PLUMBER_URL, headers={"Content-Type": "application/json"},
                        data=json.dumps(payload), timeout=120)
    finally:
      for p in temp_paths:
        try: os.remove(p)
        except OSError: pass

    # pass through diagnostics on non-200
    if r.status_code != 200:
      try:
        return jsonify(r.json()), r.status_code
      except Exception:
        return jsonify({"error": "Plumber error", "details": r.text}), r.status_code

    data = r.json()
    if not data.get("success"):
      # R will return error + diagnostics (422) in this path
      return jsonify(data), 422

    return jsonify({
      "png_base64": data.get("png_base64"),
      "pdf_base64": data.get("pdf_base64")
    }), 200

  except Exception as e:
    return jsonify({"error": str(e)}), 500
