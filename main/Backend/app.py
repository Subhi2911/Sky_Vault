from flask import Flask, request, jsonify, send_from_directory, redirect
from flask_cors import CORS
import os, random, time, smtplib, mimetypes
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone

def _utcnow():
    return datetime.now(timezone.utc).isoformat()
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:5174", os.environ.get("FRONTEND_URL", "*")])

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://rhjifebqvfqrvckxnwpp.supabase.co"
SUPABASE_KEY = os.environ.get(
    'service_role_key',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoamlmZWJxdmZxcnZja3hud3BwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDcxMjM2NiwiZXhwIjoyMDkwMjg4MzY2fQ.yPlQfF04lpSFARKnJLlrVt_7CILB9iccoo3f-UF4JYE'
)
BUCKET = "skyvault"
sb     = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Email ─────────────────────────────────────────────────────────────────────
GMAIL_USER     = os.environ.get('GMAIL_USER', '')
GMAIL_PASSWORD = os.environ.get('GMAIL_APP_PASSWORD', '')

# ── Static serving ────────────────────────────────────────────────────────────
@app.route("/")
def landing():
    return send_from_directory('../frontend/templates', 'landing-page.html')

@app.route("/<path:filename>")
def serve_static(filename):
    if filename.startswith('api/'):
        return jsonify({"error": "not found"}), 404
    if filename.endswith('.html'):
        return send_from_directory('../frontend/templates', filename)
    if filename.endswith('.js'):
        r = send_from_directory('../frontend', filename)
        r.headers['Content-Type'] = 'application/javascript'
        return r
    return send_from_directory('../frontend/templates', filename)


# ═══════════════════════════════════════════════════════════════════════════════
# ORGANISATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/org/all", methods=["GET"])
def list_all_orgs():
    """Platform owner lists all organisations."""
    try:
        secret = request.headers.get('X-Platform-Secret', '')
        if secret != os.environ.get('PLATFORM_SECRET', 'skyvault-platform-2026'):
            return jsonify({"error": "Unauthorized"}), 401
        r = sb.table('organisations').select('id,name,code,contact_email,status,created_at') \
            .order('created_at', desc=True).execute()
        return jsonify({"orgs": r.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/org/create", methods=["POST"])
def create_org():
    """
    Platform owner creates a new organisation.
    Protected by PLATFORM_SECRET header — only the Sky Vault team can call this.
    """
    try:
        secret = request.headers.get('X-Platform-Secret', '')
        if secret != os.environ.get('PLATFORM_SECRET', 'skyvault-platform-2026'):
            return jsonify({"error": "Unauthorized"}), 401

        data     = request.json
        name     = data.get('name', '').strip()
        email    = data.get('contact_email', '').strip()   # org's contact email
        if not name:
            return jsonify({"error": "Organisation name required"}), 400

        code = _gen_org_code(name)

        r = sb.table('organisations').insert({
            "name":          name,
            "code":          code,
            "contact_email": email,
            "status":        "active",
            "created_at":    _utcnow()
        }).execute()

        org = r.data[0]

        # Email the org code to the contact email if provided
        if email:
            try:
                _send_email(email, 'Sky Vault — Your Organisation is Ready', f"""
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:2rem;background:#f8fafc;border-radius:12px;">
                    <h2 style="color:#6366f1;text-align:center;">Sky Vault</h2>
                    <p style="color:#334155;">Your organisation <strong>{name}</strong> has been set up on Sky Vault.</p>
                    <p style="color:#334155;margin-top:1rem;">Your admin join code is:</p>
                    <div style="font-size:2.5rem;font-weight:800;letter-spacing:.5rem;text-align:center;color:#1e293b;background:white;padding:1.5rem;border-radius:8px;margin:1rem 0;">{code}</div>
                    <p style="color:#64748b;font-size:.875rem;">Use this code to sign up as Admin at <a href="http://127.0.0.1:5000/organization-role.html">Sky Vault</a>. Then share it with your teachers and students.</p>
                </div>
                """)
            except Exception:
                pass  # Email failure shouldn't block the response

        return jsonify({
            "org_id":        org['id'],
            "name":          org['name'],
            "code":          org['code'],
            "contact_email": email
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/org/<org_id>", methods=["GET"])
def get_org(org_id):
    try:
        r = sb.table('organisations').select('id,name,code').eq('id', org_id).execute()
        if not r.data:
            return jsonify({"error": "Organisation not found"}), 404
        return jsonify(r.data[0]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/org/by-code/<code>", methods=["GET"])
def get_org_by_code(code):
    """Look up an organisation by its join code."""
    try:
        r = sb.table('organisations').select('id,name,code,email_domain').eq('code', code.upper()).execute()
        if not r.data:
            return jsonify({"error": "Organisation not found"}), 404
        return jsonify(r.data[0]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/org/<int:org_id>/members", methods=["GET"])
def get_org_members(org_id):
    """Get all members of an organisation (admin use)."""
    try:
        r = sb.table('users').select('id,name,email,role,student_id,created_at') \
            .eq('org_id', org_id).order('role').execute()
        return jsonify({"members": r.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/org/<int:org_id>/stats", methods=["GET"])
def get_org_stats(org_id):
    """Return member counts and class count for the org dashboard."""
    try:
        members = sb.table('users').select('id,role').eq('org_id', org_id).execute()
        classes = sb.table('classes').select('id', count='exact').eq('org_id', org_id).execute()
        total   = len(members.data)
        teachers = sum(1 for m in members.data if m['role'] == 'teacher')
        students = sum(1 for m in members.data if m['role'] == 'student')
        return jsonify({
            "total_members": total,
            "teachers": teachers,
            "students": students,
            "classes": classes.count or 0
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/org/members/<int:user_id>", methods=["DELETE"])
def remove_org_member(user_id):
    """Remove a member from the organisation (set org_id to null)."""
    try:
        sb.table('users').update({"org_id": None}).eq('id', user_id).execute()
        return jsonify({"message": "Member removed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/org/members/<int:user_id>/role", methods=["PUT"])
def update_member_role(user_id):
    """Admin promotes/demotes a member to teacher or student."""
    try:
        new_role = request.json.get('role', '').strip()
        if new_role not in ('teacher', 'student', 'user'):
            return jsonify({"error": "Invalid role. Must be teacher, student, or user"}), 400

        # Generate student_id if promoting to student
        student_id = None
        if new_role == 'student':
            existing = sb.table('users').select('student_id').eq('id', user_id).execute()
            if existing.data and not existing.data[0].get('student_id'):
                email_prefix = email.split('@')[0]
                student_id = email_prefix.upper() if email_prefix and len(email_prefix) >= 4 else _gen_student_id()

        updates = {"role": new_role}
        if student_id:
            updates["student_id"] = student_id

        sb.table('users').update(updates).eq('id', user_id).execute()

        # Send student ID email if newly assigned
        if student_id:
            user_data = sb.table('users').select('email,name').eq('id', user_id).execute()
            if user_data.data:
                _send_student_id_email(user_data.data[0]['email'], user_data.data[0]['name'], student_id)

        return jsonify({"message": f"Role updated to {new_role}", "student_id": student_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/org/<int:org_id>/classes", methods=["GET"])
def get_org_classes(org_id):
    """Get all classes in an organisation."""
    try:
        r = sb.table('classes').select('id,name,subject,created_at,teacher_id') \
            .eq('org_id', org_id).order('created_at', desc=True).execute()
        # Attach teacher name
        result = []
        for cls in r.data:
            teacher = sb.table('users').select('name,email').eq('id', cls['teacher_id']).execute()
            cls['teacher_name'] = teacher.data[0]['name'] if teacher.data else 'Unknown'
            result.append(cls)
        return jsonify({"classes": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# USER ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/user/register", methods=["POST"])
def register_user():
    """
    Register a user. Behaviour by role:
      - 'user'    : standalone, no org, no student_id
      - 'student' : requires org_code, gets auto-generated student_id
      - 'teacher' : requires org_code, no student_id
      - 'admin'   : creates org if org_name provided, or joins via org_code
    """
    try:
        data         = request.json
        firebase_uid = data.get('firebase_uid')
        email        = data.get('email', '').strip().lower()
        name         = data.get('name', '')
        role         = data.get('role', 'user')
        org_code     = data.get('org_code', '').strip().upper()   # for joining existing org
        org_name     = data.get('org_name', '').strip()           # for admin creating new org

        if not firebase_uid or not email:
            return jsonify({"error": "Missing required fields"}), 400

        # ── Resolve org_id ────────────────────────────────────────────────────
        org_id = None
        if role in ('student', 'teacher', 'admin'):
            if org_code:
                org_r = sb.table('organisations').select('id,status,email_domain').eq('code', org_code).execute()
                if not org_r.data:
                    return jsonify({"error": f"Organisation code '{org_code}' not found. Please check the code sent to you."}), 404
                if org_r.data[0].get('status') == 'pending':
                    return jsonify({"error": "This organisation has not been activated yet. Please contact Sky Vault support."}), 403
                org_id = org_r.data[0]['id']
                # Validate email domain if org has one set
                email_domain = org_r.data[0].get('email_domain')
                if email_domain and role in ('student', 'teacher'):
                    user_domain = email.split('@')[-1].lower().strip()
                    if user_domain != email_domain.lower().strip():
                        return jsonify({"error": f"Your email domain (@{user_domain}) does not match this organisation's domain (@{email_domain}). Please use your organisation email."}), 403
            else:
                return jsonify({"error": "Organisation code is required to sign up as admin, teacher, or student."}), 400

        # ── Check existing user ───────────────────────────────────────────────
        existing = sb.table('users').select('*').or_(
            f'firebase_uid.eq.{firebase_uid},email.eq.{email}'
        ).execute()

        if existing.data:
            user = existing.data[0]
            sid  = user.get('student_id')

            # Assign student_id if missing
            if role == 'student' and not sid:
                sid = _extract_roll_number(email) or _gen_student_id()
                sb.table('users').update({
                    'student_id': sid, 'role': role, 'org_id': org_id
                }).eq('id', user['id']).execute()
                # Only email the ST#### style IDs — roll numbers the student already knows
                if sid.upper().startswith('ST'):
                    _send_student_id_email(email, name, sid)

            return jsonify({
                "message":    "User already exists",
                "user_id":    user['id'],
                "student_id": sid,
                "org_id":     user.get('org_id') or org_id
            }), 200

        # ── New user ──────────────────────────────────────────────────────────
        if role == 'student':
            roll = _extract_roll_number(email)
            if roll:
                # Edu/Microsoft email — use roll number, no need to email it
                student_id = roll
                send_id_email = False
            else:
                # Regular email — generate ST#### and email it
                student_id = _gen_student_id()
                send_id_email = True
        else:
            student_id = None
            send_id_email = False

        result = sb.table('users').insert({
            "firebase_uid": firebase_uid,
            "email":        email,
            "name":         name,
            "role":         role,
            "student_id":   student_id,
            "org_id":       org_id,
            "created_at":   _utcnow()
        }).execute()

        user_id = result.data[0]['id']

        if role == 'student' and student_id and send_id_email:
            _send_student_id_email(email, name, student_id)

        # If admin just created an org, return the org code so they can share it
        org_info = {}
        if role == 'admin' and org_id:
            org_r = sb.table('organisations').select('code,name').eq('id', org_id).execute()
            if org_r.data:
                org_info = {"org_code": org_r.data[0]['code'], "org_name": org_r.data[0]['name']}

        return jsonify({
            "message":    "User registered successfully",
            "user_id":    user_id,
            "student_id": student_id,
            "org_id":     org_id,
            **org_info
        }), 201

    except Exception as e:
        print(f"register_user error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/user/<firebase_uid>", methods=["GET"])
def get_user(firebase_uid):
    try:
        r = sb.table('users').select('id,firebase_uid,email,name,role,student_id,org_id,created_at') \
            .eq('firebase_uid', firebase_uid).execute()
        if not r.data:
            return jsonify({"error": "User not found"}), 404
        return jsonify(r.data[0]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/user/<firebase_uid>", methods=["PUT"])
def update_user(firebase_uid):
    try:
        data    = request.json
        updates = {k: data[k] for k in ('name', 'email') if k in data and data[k] is not None}
        if not updates:
            return jsonify({"error": "No fields to update"}), 400
        sb.table('users').update(updates).eq('firebase_uid', firebase_uid).execute()
        return jsonify({"message": "User updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Student helpers ────────────────────────────────────────────────────────────

@app.route("/api/student/by-uid/<firebase_uid>", methods=["GET"])
def get_student_by_uid(firebase_uid):
    try:
        r = sb.table('users').select('student_id,name,org_id') \
            .eq('firebase_uid', firebase_uid).execute()
        if not r.data:
            return jsonify({"error": "User not found"}), 404
        return jsonify(r.data[0]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/student/lookup", methods=["POST"])
def lookup_student():
    try:
        email = request.json.get('email', '').strip().lower()
        if not email:
            return jsonify({"error": "Email required"}), 400
        r = sb.table('users').select('student_id').eq('email', email).eq('role', 'student').execute()
        if not r.data or not r.data[0].get('student_id'):
            return jsonify({"error": "Student not found"}), 404
        return jsonify({"student_id": r.data[0]['student_id']}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# FILE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/files/upload", methods=["POST"])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file         = request.files['file']
        firebase_uid = request.form.get('firebase_uid')
        folder_id    = request.form.get('folder_id') or None
        dashboard    = request.form.get('dashboard', 'user')

        if not firebase_uid or not file.filename:
            return jsonify({"error": "firebase_uid and file required"}), 400

        ur = sb.table('users').select('id,org_id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "User not found"}), 404

        user_id = ur.data[0]['id']
        org_id  = ur.data[0].get('org_id')

        original  = file.filename
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        ext       = original.rsplit('.', 1)[-1] if '.' in original else ''
        base      = original.rsplit('.', 1)[0]  if '.' in original else original

        # ── Deduplicate filename ──────────────────────────────────────────────
        # Check if a file with the same name already exists for this user
        existing = sb.table('files').select('filename').eq('user_id', user_id) \
            .eq('trashed', False).execute()
        existing_names = {f['filename'] for f in (existing.data or [])}

        display_name = original
        if display_name in existing_names:
            counter = 1
            while True:
                candidate = f"{base} {counter}.{ext}" if ext else f"{base} {counter}"
                if candidate not in existing_names:
                    display_name = candidate
                    break
                counter += 1

        fname = f"{timestamp}_{display_name}"

        # Storage path: org users → org/{org_id}/{user_id}/{dashboard}/file
        #               personal  → personal/{user_id}/{dashboard}/file
        if org_id:
            path = f"org/{org_id}/{user_id}/{dashboard}/{fname}"
        else:
            path = f"personal/{user_id}/{dashboard}/{fname}"

        file_bytes = file.read()
        file_size  = len(file_bytes)
        mime_type  = file.content_type or mimetypes.guess_type(original)[0] or 'application/octet-stream'

        sb.storage.from_(BUCKET).upload(
            path, file_bytes,
            {"content-type": mime_type, "upsert": "false"}
        )
        public_url = sb.storage.from_(BUCKET).get_public_url(path)

        result = sb.table('files').insert({
            "user_id":      user_id,
            "org_id":       org_id,
            "filename":     display_name,
            "storage_path": path,
            "folder_id":    int(folder_id) if folder_id else None,
            "upload_time":  _utcnow(),
            "dashboard":    dashboard,
            "file_size":    file_size,
            "trashed":      False,
            "public_url":   public_url
        }).execute()

        file_id = result.data[0]['id']
        return jsonify({
            "message":    "File uploaded successfully",
            "file_id":    file_id,
            "filename":   display_name,
            "public_url": public_url
        }), 201

    except Exception as e:
        print(f"upload_file error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/<firebase_uid>", methods=["GET"])
def get_user_files(firebase_uid):
    try:
        dashboard = request.args.get('dashboard', 'user')
        ur = sb.table('users').select('id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"files": []}), 200
        user_id = ur.data[0]['id']

        r = sb.table('files') \
            .select('id,filename,upload_time,trashed,file_size,public_url,starred') \
            .eq('user_id', user_id) \
            .eq('dashboard', dashboard) \
            .is_('folder_id', 'null') \
            .order('upload_time', desc=True) \
            .execute()

        return jsonify({"files": r.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/all/<firebase_uid>", methods=["GET"])
def get_all_user_files(firebase_uid):
    """Returns all non-trashed files for a user across all folders and dashboards."""
    try:
        ur = sb.table('users').select('id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "User not found"}), 404
        user_id = ur.data[0]['id']
        r = sb.table('files').select('id,filename,upload_time,file_size,public_url,dashboard,starred') \
            .eq('user_id', user_id).eq('trashed', False).order('upload_time', desc=True).execute()
        return jsonify({"files": r.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/storage/<firebase_uid>", methods=["GET"])
def get_storage_usage(firebase_uid):
    """Returns total bytes used by this user across all files (not trashed)."""
    try:
        ur = sb.table('users').select('id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "User not found"}), 404
        user_id = ur.data[0]['id']

        r = sb.table('files').select('file_size') \
            .eq('user_id', user_id) \
            .eq('trashed', False) \
            .execute()

        total = sum(f.get('file_size') or 0 for f in r.data)
        return jsonify({"used_bytes": total, "file_count": len(r.data)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/search/<firebase_uid>", methods=["GET"])
def search_files(firebase_uid):
    try:
        query     = request.args.get('q', '').strip()
        dashboard = request.args.get('dashboard', 'user')

        ur = sb.table('users').select('id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "User not found"}), 404
        user_id = ur.data[0]['id']

        r = sb.table('files') \
            .select('id,filename,upload_time,trashed,file_size,public_url,starred') \
            .eq('user_id', user_id) \
            .eq('dashboard', dashboard) \
            .eq('trashed', False) \
            .ilike('filename', f'%{query}%') \
            .order('upload_time', desc=True) \
            .limit(50) \
            .execute()

        return jsonify({"files": r.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/download/<int:file_id>", methods=["GET"])
def download_file(file_id):
    try:
        r = sb.table('files').select('public_url').eq('id', file_id).execute()
        if not r.data:
            return jsonify({"error": "File not found"}), 404
        return redirect(r.data[0]['public_url'])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/<int:file_id>/star", methods=["PUT"])
def toggle_star(file_id):
    try:
        r = sb.table('files').select('starred').eq('id', file_id).execute()
        if not r.data:
            return jsonify({"error": "File not found"}), 404
        current = r.data[0].get('starred', False)
        sb.table('files').update({"starred": not current}).eq('id', file_id).execute()
        return jsonify({"message": "Star toggled", "starred": not current}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/<int:file_id>/trash", methods=["PUT"])
def trash_file(file_id):
    try:
        sb.table('files').update({"trashed": True, "trashed_at": _utcnow()}).eq('id', file_id).execute()
        return jsonify({"message": "File moved to trash"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/<int:file_id>/restore", methods=["PUT"])
def restore_file(file_id):
    try:
        sb.table('files').update({"trashed": False, "trashed_at": None}).eq('id', file_id).execute()
        return jsonify({"message": "File restored"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/<int:file_id>", methods=["DELETE"])
def delete_file(file_id):
    try:
        r = sb.table('files').select('storage_path').eq('id', file_id).execute()
        if not r.data:
            return jsonify({"error": "File not found"}), 404
        path = r.data[0].get('storage_path')
        if path:
            try:
                sb.storage.from_(BUCKET).remove([path])
            except Exception:
                pass
        sb.table('files').delete().eq('id', file_id).execute()
        return jsonify({"message": "File deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/<firebase_uid>/empty-trash", methods=["DELETE"])
def empty_trash(firebase_uid):
    try:
        ur = sb.table('users').select('id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "User not found"}), 404
        user_id = ur.data[0]['id']

        trashed = sb.table('files').select('id,storage_path') \
            .eq('user_id', user_id).eq('trashed', True).execute()
        paths = [f['storage_path'] for f in trashed.data if f.get('storage_path')]
        if paths:
            try:
                sb.storage.from_(BUCKET).remove(paths)
            except Exception:
                pass
        for fid in [f['id'] for f in trashed.data]:
            sb.table('files').delete().eq('id', fid).execute()

        return jsonify({"message": f"Deleted {len(trashed.data)} file(s)"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
def purge_old_trash():
    try:
        cutoff = (datetime.now() - timedelta(days=30)).isoformat()
        old = sb.table('files').select('id,storage_path').eq('trashed', True).lt('trashed_at', cutoff).execute()
        if old.data:
            paths = [f['storage_path'] for f in old.data if f.get('storage_path')]
            if paths:
                sb.storage.from_(BUCKET).remove(paths)
            for f in old.data:
                sb.table('files').delete().eq('id', f['id']).execute()
    except Exception:
        pass

_purge_counter = 0
@app.before_request
def auto_purge():
    global _purge_counter
    _purge_counter += 1
    if _purge_counter % 100 == 0:
        purge_old_trash()

# FOLDER ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/folders", methods=["POST"])
def create_folder():
    try:
        data         = request.json
        firebase_uid = data.get('firebase_uid')
        name         = data.get('name', '').strip()
        if not firebase_uid or not name:
            return jsonify({"error": "firebase_uid and name required"}), 400

        ur = sb.table('users').select('id,org_id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "User not found"}), 404

        user_id = ur.data[0]['id']
        org_id  = ur.data[0].get('org_id')

        r = sb.table('folders').insert({
            "user_id":    user_id,
            "org_id":     org_id,
            "name":       name,
            "created_at": _utcnow()
        }).execute()

        return jsonify({"message": "Folder created", "folder_id": r.data[0]['id'], "name": name}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/folders/<firebase_uid>", methods=["GET"])
def get_folders(firebase_uid):
    try:
        ur = sb.table('users').select('id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            # New user not registered yet — return empty folders
            return jsonify({"folders": []}), 200
        user_id = ur.data[0]['id']

        folders = sb.table('folders').select('id,name,created_at') \
            .eq('user_id', user_id).order('created_at', desc=True).execute()

        result = []
        for folder in folders.data:
            cnt = sb.table('files').select('id', count='exact') \
                .eq('folder_id', folder['id']).eq('trashed', False).execute()
            result.append({**folder, "file_count": cnt.count or 0})

        return jsonify({"folders": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/folders/<int:folder_id>", methods=["DELETE"])
def delete_folder(folder_id):
    try:
        trashed_at = _utcnow()
        sb.table('files').update({"trashed": True, "trashed_at": trashed_at, "folder_id": None}).eq('folder_id', folder_id).execute()
        sb.table('folders').delete().eq('id', folder_id).execute()
        return jsonify({"message": "Folder deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/folders/<int:folder_id>/files", methods=["GET"])
def get_folder_files(folder_id):
    try:
        r = sb.table('files') \
            .select('id,filename,upload_time,trashed,file_size,public_url,starred') \
            .eq('folder_id', folder_id).eq('trashed', False) \
            .order('upload_time', desc=True).execute()
        return jsonify({"files": r.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# OTP ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/auth/send-otp", methods=["POST"])
def send_otp():
    try:
        email = request.json.get('email', '').strip().lower()
        if not email:
            return jsonify({"error": "Email required"}), 400

        code       = str(random.randint(10000, 99999))
        expires_at = int(time.time()) + 600
        now        = int(time.time())

        # Upsert into Supabase otp_store
        sb.table('otp_store').upsert({
            "email": email, "code": code,
            "expires_at": expires_at, "created_at": now
        }, on_conflict="email").execute()

        if not GMAIL_USER or not GMAIL_PASSWORD:
            print(f"[DEV] OTP for {email}: {code}")
            return jsonify({"message": "OTP sent (dev mode)", "dev_code": code}), 200

        _send_email(email, 'Sky Vault - Email Verification Code', f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#f8fafc;border-radius:12px;">
            <h2 style="color:#667eea;text-align:center;">Sky Vault</h2>
            <p style="color:#334155;">Your verification code is:</p>
            <div style="font-size:2.5rem;font-weight:800;letter-spacing:0.5rem;text-align:center;color:#1e293b;background:white;padding:1.5rem;border-radius:8px;margin:1rem 0;">{code}</div>
            <p style="color:#64748b;font-size:0.875rem;">Expires in 10 minutes.</p>
        </div>
        """)
        return jsonify({"message": "OTP sent"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    try:
        email = request.json.get('email', '').strip().lower()
        code  = request.json.get('code', '').strip()
        if not email or not code:
            return jsonify({"error": "Email and code required"}), 400

        r = sb.table('otp_store').select('code,expires_at').eq('email', email).execute()
        if not r.data:
            return jsonify({"error": "No OTP found. Please request a new one."}), 400

        entry = r.data[0]
        if int(time.time()) > entry['expires_at']:
            sb.table('otp_store').delete().eq('email', email).execute()
            return jsonify({"error": "OTP expired. Please request a new one."}), 400
        if entry['code'] != code:
            return jsonify({"error": "Invalid code."}), 400

        sb.table('otp_store').delete().eq('email', email).execute()
        return jsonify({"message": "Email verified"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _gen_student_id():
    for _ in range(20):
        candidate = 'ST' + str(random.randint(1000, 9999))
        if not sb.table('users').select('id').eq('student_id', candidate).execute().data:
            return candidate
    return 'ST' + str(random.randint(1000, 9999))


def _extract_roll_number(email):
    """
    Extract roll number from institutional email addresses.
    e.g. 2401350015@krmu.edu.in → '2401350015'
    Returns None if the email prefix doesn't look like a roll number.
    A roll number is: purely numeric, or starts with digits, min 6 chars.
    """
    prefix = email.split('@')[0] if '@' in email else ''
    # Must be at least 6 chars and start with a digit (roll numbers are numeric/alphanumeric starting with year)
    if len(prefix) >= 6 and prefix[0].isdigit():
        return prefix.upper()
    return None


def _gen_org_code(name):
    """Generate a short unique org code like 'SKY001'."""
    prefix = ''.join(c for c in name.upper() if c.isalpha())[:3].ljust(3, 'X')
    for _ in range(50):
        code = prefix + str(random.randint(100, 999))
        if not sb.table('organisations').select('id').eq('code', code).execute().data:
            return code
    return prefix + str(random.randint(1000, 9999))


def _send_email(to, subject, html_body):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From']    = GMAIL_USER
    msg['To']      = to
    msg.attach(MIMEText(html_body, 'html'))
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        server.sendmail(GMAIL_USER, to, msg.as_string())


def _send_student_id_email(email, name, student_id):
    try:
        if not GMAIL_USER or not GMAIL_PASSWORD:
            print(f"[DEV] Student ID for {email}: {student_id}")
            return
        _send_email(email, 'Sky Vault - Your Student ID', f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#f8fafc;border-radius:12px;">
            <h2 style="color:#f5576c;text-align:center;">Sky Vault</h2>
            <p style="color:#334155;">Welcome, {name}! Your Student ID is:</p>
            <div style="font-size:2rem;font-weight:800;letter-spacing:0.3rem;text-align:center;color:#1e293b;background:white;padding:1.5rem;border-radius:8px;margin:1rem 0;">{student_id}</div>
            <p style="color:#64748b;font-size:0.875rem;">Keep this safe. You need it to log in.</p>
        </div>
        """)
        print(f"Student ID email sent to {email}")
    except Exception as e:
        print(f"Failed to send student ID email: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# CLASS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/classes", methods=["POST"])
def create_class():
    try:
        data = request.json
        firebase_uid = data.get('firebase_uid')
        org_id = data.get('org_id')
        name = data.get('name', '').strip()
        subject = data.get('subject', '').strip()
        description = data.get('description', '').strip()

        if not firebase_uid or not org_id or not name:
            return jsonify({"error": "firebase_uid, org_id and name required"}), 400

        ur = sb.table('users').select('id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "Teacher not found"}), 404
        teacher_id = ur.data[0]['id']

        r = sb.table('classes').insert({
            "org_id": org_id,
            "teacher_id": teacher_id,
            "name": name,
            "subject": subject,
            "description": description,
            "created_at": _utcnow()
        }).execute()

        return jsonify({"message": "Class created", "class": r.data[0]}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/classes/teacher/<firebase_uid>", methods=["GET"])
def get_teacher_classes(firebase_uid):
    try:
        ur = sb.table('users').select('id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "Teacher not found"}), 404
        teacher_id = ur.data[0]['id']

        r = sb.table('classes').select('id,name,subject,description,created_at') \
            .eq('teacher_id', teacher_id).order('created_at', desc=True).execute()

        classes = []
        for cls in r.data:
            sc = sb.table('class_students').select('id', count='exact') \
                .eq('class_id', cls['id']).eq('status', 'accepted').execute()
            ac = sb.table('assignments').select('id', count='exact') \
                .eq('class_id', cls['id']).execute()
            classes.append({**cls, "student_count": sc.count or 0, "assignment_count": ac.count or 0})

        return jsonify({"classes": classes}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/classes/student/<firebase_uid>", methods=["GET"])
def get_student_classes(firebase_uid):
    try:
        ur = sb.table('users').select('id,role,org_id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "Student not found"}), 404
        
        user_row = ur.data[0]
        student_db_id = user_row['id']

        cs = sb.table('class_students').select('class_id') \
            .eq('student_id', student_db_id).eq('status', 'accepted').execute()
        class_ids = [c['class_id'] for c in cs.data]

        if not class_ids:
            return jsonify({"classes": []}), 200

        classes = []
        for cid in class_ids:
            cr = sb.table('classes').select('id,name,subject,description,created_at,teacher_id').eq('id', cid).execute()
            if cr.data:
                cls = cr.data[0]
                tr = sb.table('users').select('name').eq('id', cls['teacher_id']).execute()
                teacher_name = tr.data[0]['name'] if tr.data else 'Unknown'
                ac = sb.table('assignments').select('id', count='exact').eq('class_id', cid).execute()
                classes.append({**cls, "teacher_name": teacher_name, "assignment_count": ac.count or 0})

        return jsonify({"classes": classes}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/classes/<class_id>", methods=["DELETE"])
def delete_class(class_id):
    try:
        sb.table('class_students').delete().eq('class_id', class_id).execute()
        sb.table('assignments').delete().eq('class_id', class_id).execute()
        try:
            sb.table('class_notes').delete().eq('class_id', class_id).execute()
        except Exception:
            pass
        sb.table('classes').delete().eq('id', class_id).execute()
        return jsonify({"message": "Class deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# CLASS STUDENT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/classes/<int:class_id>/students", methods=["GET"])
def get_class_students(class_id):
    try:
        cs = sb.table('class_students').select('student_id,status,joined_at') \
            .eq('class_id', class_id).execute()
        students = []
        for row in cs.data:
            ur = sb.table('users').select('id,name,email,student_id') \
                .eq('id', row['student_id']).execute()
            if ur.data:
                students.append({**ur.data[0], "joined_at": row['joined_at'], "status": row['status']})
        return jsonify({"students": students}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/classes/<int:class_id>/students", methods=["POST"])
def add_student_to_class(class_id):
    """Add a student to a class by their student_id string (e.g. ST1234)."""
    try:
        student_id_str = request.json.get('student_id', '').strip().upper()
        if not student_id_str:
            return jsonify({"error": "student_id required"}), 400

        ur = sb.table('users').select('id,name,email,student_id,org_id') \
            .eq('student_id', student_id_str).execute()
        if not ur.data:
            return jsonify({"error": f"Student '{student_id_str}' not found"}), 404
        student = ur.data[0]

        # Check already enrolled
        existing = sb.table('class_students').select('id') \
            .eq('class_id', class_id).eq('student_id', student['id']).execute()
        if existing.data:
            return jsonify({"error": "Student already in this class"}), 409

        sb.table('class_students').insert({
            "class_id":   class_id,
            "student_id": student['id'],
            "status":     "pending",
            "joined_at":  _utcnow()
        }).execute()

        # Update student's org_id if not set
        cls_r = sb.table('classes').select('name,org_id,teacher_id').eq('id', class_id).execute()
        cls_name = 'a class'
        if cls_r.data:
            cls_name = cls_r.data[0]['name']
            cls_org_id = cls_r.data[0].get('org_id')
            if cls_org_id and not student.get('org_id'):
                sb.table('users').update({'org_id': cls_org_id}).eq('id', student['id']).execute()

        # Notify student with pending invite
        _create_notification(student['id'],
            f"Class invite: {cls_name}",
            f"INVITE:{class_id}:{cls_name}")

        return jsonify({"message": "Invite sent to student", "student": student}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/classes/<int:class_id>/students/<int:student_db_id>", methods=["DELETE"])
def remove_student_from_class(class_id, student_db_id):
    try:
        sb.table('class_students').delete() \
            .eq('class_id', class_id).eq('student_id', student_db_id).execute()
        return jsonify({"message": "Student removed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/classes/<int:class_id>/invite/accept", methods=["POST"])
def accept_class_invite(class_id):
    try:
        firebase_uid = request.json.get('firebase_uid')
        ur = sb.table('users').select('id,name,student_id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "User not found"}), 404
        student = ur.data[0]

        sb.table('class_students').update({
            "status": "accepted", "joined_at": _utcnow()
        }).eq('class_id', class_id).eq('student_id', student['id']).execute()

        # Notify teacher
        cls_r = sb.table('classes').select('name,teacher_id').eq('id', class_id).execute()
        if cls_r.data:
            cls = cls_r.data[0]
            _create_notification(cls['teacher_id'],
                f"{student['name']} ({student['student_id']}) accepted your invite",
                f"They joined {cls['name']}")

        return jsonify({"message": "Invite accepted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/classes/<int:class_id>/invite/reject", methods=["POST"])
def reject_class_invite(class_id):
    try:
        firebase_uid = request.json.get('firebase_uid')
        ur = sb.table('users').select('id,name,student_id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "User not found"}), 404
        student = ur.data[0]

        sb.table('class_students').delete() \
            .eq('class_id', class_id).eq('student_id', student['id']).execute()

        # Notify teacher
        cls_r = sb.table('classes').select('name,teacher_id').eq('id', class_id).execute()
        if cls_r.data:
            cls = cls_r.data[0]
            _create_notification(cls['teacher_id'],
                f"{student['name']} ({student['student_id']}) declined your invite",
                f"They did not join {cls['name']}")

        return jsonify({"message": "Invite rejected"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# ASSIGNMENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/classes/<int:class_id>/assignments", methods=["GET"])
def get_class_assignments(class_id):
    try:
        r = sb.table('assignments').select('id,title,description,marks,due_date,created_at,file_id') \
            .eq('class_id', class_id).order('created_at', desc=True).execute()
        assignments = []
        for a in r.data:
            sub_count = sb.table('submissions').select('id', count='exact') \
                .eq('assignment_id', a['id']).execute()
            file_info = None
            if a.get('file_id'):
                fr = sb.table('files').select('filename,public_url').eq('id', a['file_id']).execute()
                if fr.data:
                    file_info = fr.data[0]
            assignments.append({**a, "submission_count": sub_count.count or 0, "file": file_info})
        return jsonify({"assignments": assignments}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/classes/<int:class_id>/assignments", methods=["POST"])
def create_assignment(class_id):
    try:
        # Support both multipart (with file) and JSON (without file)
        if request.content_type and 'multipart' in request.content_type:
            title       = request.form.get('title', '').strip()
            description = request.form.get('description', '')
            marks       = int(request.form.get('marks', 100))
            due_date    = request.form.get('due_date', '')
            firebase_uid = request.form.get('firebase_uid', '')
        else:
            data        = request.json
            title       = data.get('title', '').strip()
            description = data.get('description', '')
            marks       = int(data.get('marks', 100))
            due_date    = data.get('due_date', '')
            firebase_uid = data.get('firebase_uid', '')

        if not title:
            return jsonify({"error": "title required"}), 400

        # Upload question paper file if provided
        file_id = None
        if request.files and 'file' in request.files:
            file = request.files['file']
            if file and file.filename:
                ur = sb.table('users').select('id,org_id').eq('firebase_uid', firebase_uid).execute()
                if ur.data:
                    teacher_id = ur.data[0]['id']
                    org_id     = ur.data[0].get('org_id')
                    original   = file.filename
                    timestamp  = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
                    ext        = original.rsplit('.', 1)[-1] if '.' in original else ''
                    base       = original.rsplit('.', 1)[0]  if '.' in original else original
                    fname      = f"{timestamp}_{base}.{ext}" if ext else f"{timestamp}_{base}"
                    path       = f"assignments/{class_id}/{fname}"
                    file_bytes = file.read()
                    mime_type  = file.content_type or mimetypes.guess_type(original)[0] or 'application/octet-stream'
                    sb.storage.from_(BUCKET).upload(path, file_bytes, {"content-type": mime_type, "upsert": "false"})
                    public_url = sb.storage.from_(BUCKET).get_public_url(path)
                    fr = sb.table('files').insert({
                        "user_id": teacher_id, "org_id": org_id,
                        "filename": original, "storage_path": path,
                        "upload_time": _utcnow(),
                        "dashboard": "teacher", "file_size": len(file_bytes),
                        "trashed": False, "public_url": public_url
                    }).execute()
                    file_id = fr.data[0]['id']

        r = sb.table('assignments').insert({
            "class_id":    class_id,
            "title":       title,
            "description": description,
            "marks":       marks,
            "due_date":    due_date,
            "file_id":     file_id,
            "created_at":  _utcnow()
        }).execute()

        # Notify all accepted students
        cs = sb.table('class_students').select('student_id').eq('class_id', class_id).eq('status', 'accepted').execute()
        for row in cs.data:
            _create_notification(row['student_id'], f"New assignment: {title}",
                                 f"Due: {due_date or 'No due date'}")

        return jsonify({"message": "Assignment created", "assignment": r.data[0]}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/assignments/<int:assignment_id>", methods=["DELETE"])
def delete_assignment(assignment_id):
    try:
        sb.table('submissions').delete().eq('assignment_id', assignment_id).execute()
        sb.table('assignments').delete().eq('id', assignment_id).execute()
        return jsonify({"message": "Assignment deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/assignments/<int:assignment_id>/submissions", methods=["GET"])
def get_assignment_submissions(assignment_id):
    """Returns submitted and pending students for an assignment."""
    try:
        ar = sb.table('assignments').select('class_id').eq('id', assignment_id).execute()
        if not ar.data:
            return jsonify({"error": "Assignment not found"}), 404
        class_id = ar.data[0]['class_id']

        cs = sb.table('class_students').select('student_id') \
            .eq('class_id', class_id).eq('status', 'accepted').execute()
        all_student_ids = [r['student_id'] for r in cs.data]

        subs = sb.table('submissions').select('student_id,submitted_at,file_id,checked,obtained_marks,submit_count') \
            .eq('assignment_id', assignment_id).execute()
        submitted_ids = {s['student_id'] for s in subs.data}

        submitted, pending = [], []
        for sid in all_student_ids:
            ur = sb.table('users').select('id,name,student_id').eq('id', sid).execute()
            if not ur.data:
                continue
            u = ur.data[0]
            if sid in submitted_ids:
                sub = next(s for s in subs.data if s['student_id'] == sid)
                file_info = None
                if sub.get('file_id'):
                    fr = sb.table('files').select('filename,public_url').eq('id', sub['file_id']).execute()
                    if fr.data:
                        file_info = fr.data[0]
                submitted.append({**u, "submitted_at": sub['submitted_at'],
                                  "file": file_info, "checked": sub.get('checked', False),
                                  "obtained_marks": sub.get('obtained_marks'),
                                  "submit_count": sub.get('submit_count', 1)})
            else:
                pending.append(u)

        return jsonify({"submitted": submitted, "pending": pending}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/assignments/<int:assignment_id>/submissions/<int:student_db_id>/check", methods=["PUT"])
def toggle_submission_checked(assignment_id, student_db_id):
    try:
        r = sb.table('submissions').select('id,checked') \
            .eq('assignment_id', assignment_id).eq('student_id', student_db_id).execute()
        if not r.data:
            return jsonify({"error": "Submission not found"}), 404
        new_val = not r.data[0].get('checked', False)
        sb.table('submissions').update({"checked": new_val}) \
            .eq('id', r.data[0]['id']).execute()
        return jsonify({"checked": new_val}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/assignments/<int:assignment_id>/submissions/<int:student_db_id>/marks", methods=["PUT"])
def give_marks(assignment_id, student_db_id):
    try:
        marks = request.json.get('marks')
        if marks is None:
            return jsonify({"error": "marks required"}), 400
        r = sb.table('submissions').select('id,obtained_marks') \
            .eq('assignment_id', assignment_id).eq('student_id', student_db_id).execute()
        if not r.data:
            return jsonify({"error": "Submission not found"}), 404

        sb.table('submissions').update({"obtained_marks": int(marks), "checked": True}) \
            .eq('id', r.data[0]['id']).execute()

        # Notify student
        ar = sb.table('assignments').select('title,marks').eq('id', assignment_id).execute()
        if ar.data:
            _create_notification(student_db_id,
                f"Your assignment was marked: {ar.data[0]['title']}",
                f"You scored {marks}/{ar.data[0]['marks']}")

        return jsonify({"message": "Marks saved", "obtained_marks": int(marks)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/assignments/<int:assignment_id>/submit", methods=["POST"])
def submit_assignment(assignment_id):
    """Student submits a file for an assignment."""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file         = request.files['file']
        firebase_uid = request.form.get('firebase_uid')
        if not firebase_uid:
            return jsonify({"error": "firebase_uid required"}), 400

        ur = sb.table('users').select('id,org_id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "User not found"}), 404
        user_id = ur.data[0]['id']
        org_id  = ur.data[0].get('org_id')

        # Upload file to Supabase storage
        original  = file.filename
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        ext       = original.rsplit('.', 1)[-1] if '.' in original else ''
        base      = original.rsplit('.', 1)[0]  if '.' in original else original
        fname     = f"{timestamp}_{base}.{ext}" if ext else f"{timestamp}_{base}"
        path      = f"submissions/{assignment_id}/{user_id}/{fname}"

        file_bytes = file.read()
        file_size  = len(file_bytes)
        mime_type  = file.content_type or mimetypes.guess_type(original)[0] or 'application/octet-stream'

        sb.storage.from_(BUCKET).upload(path, file_bytes, {"content-type": mime_type, "upsert": "true"})
        public_url = sb.storage.from_(BUCKET).get_public_url(path)

        # Save file record
        fr = sb.table('files').insert({
            "user_id":      user_id,
            "org_id":       org_id,
            "filename":     original,
            "storage_path": path,
            "upload_time":  _utcnow(),
            "dashboard":    "student",
            "file_size":    file_size,
            "trashed":      False,
            "public_url":   public_url
        }).execute()
        file_id = fr.data[0]['id']

        # Upsert submission with count tracking
        existing = sb.table('submissions').select('id,submit_count') \
            .eq('assignment_id', assignment_id).eq('student_id', user_id).execute()
        if existing.data:
            current_count = existing.data[0].get('submit_count') or 1
            if current_count >= 2:
                return jsonify({"error": "Maximum 2 submissions allowed"}), 400
            sb.table('submissions').update({
                "file_id": file_id,
                "submitted_at": _utcnow(),
                "submit_count": current_count + 1,
                "checked": False,
                "obtained_marks": None
            }).eq('id', existing.data[0]['id']).execute()
        else:
            sb.table('submissions').insert({
                "assignment_id": assignment_id,
                "student_id":    user_id,
                "file_id":       file_id,
                "submitted_at":  _utcnow(),
                "submit_count":  1
            }).execute()

        # Notify teacher
        ar = sb.table('assignments').select('class_id,title').eq('id', assignment_id).execute()
        if ar.data:
            cls = sb.table('classes').select('teacher_id,name').eq('id', ar.data[0]['class_id']).execute()
            if cls.data:
                student_name = sb.table('users').select('name,student_id').eq('id', user_id).execute()
                sname = student_name.data[0]['name'] if student_name.data else 'A student'
                sid   = student_name.data[0]['student_id'] if student_name.data else ''
                _create_notification(cls.data[0]['teacher_id'],
                    f"{sname} ({sid}) submitted {ar.data[0]['title']}",
                    f"Class: {cls.data[0]['name']}")

        return jsonify({"message": "Assignment submitted", "public_url": public_url}), 201
    except Exception as e:
        print(f"submit_assignment error: {e}")
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# CLASS NOTES ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/classes/<int:class_id>/notes", methods=["GET"])
def get_class_notes(class_id):
    try:
        r = sb.table('class_notes').select('id,title,file_id,created_at') \
            .eq('class_id', class_id).order('created_at', desc=True).execute()
        notes = []
        for n in r.data:
            file_info = None
            if n.get('file_id'):
                fr = sb.table('files').select('filename,public_url,file_size').eq('id', n['file_id']).execute()
                if fr.data:
                    file_info = fr.data[0]
            notes.append({**n, "file": file_info})
        return jsonify({"notes": notes}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/classes/<int:class_id>/notes", methods=["POST"])
def upload_class_note(class_id):
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file         = request.files['file']
        firebase_uid = request.form.get('firebase_uid')
        title        = request.form.get('title', file.filename)

        if not firebase_uid:
            return jsonify({"error": "firebase_uid required"}), 400

        ur = sb.table('users').select('id,org_id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "Teacher not found"}), 404
        teacher_id = ur.data[0]['id']
        org_id     = ur.data[0].get('org_id')

        original  = file.filename
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        ext       = original.rsplit('.', 1)[-1] if '.' in original else ''
        base      = original.rsplit('.', 1)[0]  if '.' in original else original
        fname     = f"{timestamp}_{base}.{ext}" if ext else f"{timestamp}_{base}"
        path      = f"notes/{class_id}/{fname}"

        file_bytes = file.read()
        file_size  = len(file_bytes)
        mime_type  = file.content_type or mimetypes.guess_type(original)[0] or 'application/octet-stream'

        sb.storage.from_(BUCKET).upload(path, file_bytes, {"content-type": mime_type, "upsert": "false"})
        public_url = sb.storage.from_(BUCKET).get_public_url(path)

        fr = sb.table('files').insert({
            "user_id":      teacher_id,
            "org_id":       org_id,
            "filename":     original,
            "storage_path": path,
            "upload_time":  _utcnow(),
            "dashboard":    "teacher",
            "file_size":    file_size,
            "trashed":      False,
            "public_url":   public_url
        }).execute()
        file_id = fr.data[0]['id']

        nr = sb.table('class_notes').insert({
            "class_id":   class_id,
            "teacher_id": teacher_id,
            "title":      title,
            "file_id":    file_id,
            "created_at": _utcnow()
        }).execute()

        # Notify students
        cs = sb.table('class_students').select('student_id').eq('class_id', class_id).execute()
        for row in cs.data:
            _create_notification(row['student_id'], f"New note uploaded: {title}",
                                 f"A new note is available in your class.")

        return jsonify({"message": "Note uploaded", "note": nr.data[0], "public_url": public_url}), 201
    except Exception as e:
        print(f"upload_class_note error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/classes/notes/<int:note_id>", methods=["DELETE"])
def delete_class_note(note_id):
    try:
        nr = sb.table('class_notes').select('file_id').eq('id', note_id).execute()
        if nr.data and nr.data[0].get('file_id'):
            fr = sb.table('files').select('storage_path').eq('id', nr.data[0]['file_id']).execute()
            if fr.data and fr.data[0].get('storage_path'):
                try:
                    sb.storage.from_(BUCKET).remove([fr.data[0]['storage_path']])
                except Exception:
                    pass
            sb.table('files').delete().eq('id', nr.data[0]['file_id']).execute()
        sb.table('class_notes').delete().eq('id', note_id).execute()
        return jsonify({"message": "Note deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# NOTIFICATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/notifications/<firebase_uid>", methods=["GET"])
def get_notifications(firebase_uid):
    try:
        ur = sb.table('users').select('id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "User not found"}), 404
        user_id = ur.data[0]['id']

        r = sb.table('notifications').select('id,title,body,is_read,created_at') \
            .eq('user_id', user_id).order('created_at', desc=True).limit(50).execute()
        return jsonify({"notifications": r.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/notifications/<int:notif_id>/read", methods=["PUT"])
def mark_notification_read(notif_id):
    try:
        sb.table('notifications').update({"is_read": True}).eq('id', notif_id).execute()
        return jsonify({"message": "Marked as read"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/notifications/<int:notif_id>/tag", methods=["PUT"])
def tag_notification(notif_id):
    """Append a tag to notification body to track invite actions."""
    try:
        tag = request.json.get('tag', '')
        r = sb.table('notifications').select('body').eq('id', notif_id).execute()
        if not r.data:
            return jsonify({"error": "Not found"}), 404
        current_body = r.data[0].get('body', '') or ''
        new_body = current_body + f':{tag}'
        sb.table('notifications').update({"body": new_body, "is_read": True}).eq('id', notif_id).execute()
        return jsonify({"message": "Tagged"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/notifications/<firebase_uid>/read-all", methods=["PUT"])
def mark_all_notifications_read(firebase_uid):
    try:
        ur = sb.table('users').select('id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "User not found"}), 404
        user_id = ur.data[0]['id']
        sb.table('notifications').update({"is_read": True}) \
            .eq('user_id', user_id).eq('is_read', False).execute()
        return jsonify({"message": "All marked as read"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/notifications/<firebase_uid>/clear-all", methods=["DELETE"])
def clear_all_notifications(firebase_uid):
    try:
        ur = sb.table('users').select('id').eq('firebase_uid', firebase_uid).execute()
        if not ur.data:
            return jsonify({"error": "User not found"}), 404
        user_id = ur.data[0]['id']
        sb.table('notifications').delete().eq('user_id', user_id).execute()
        return jsonify({"message": "All notifications cleared"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _create_notification(user_id, title, body=''):
    try:
        sb.table('notifications').insert({
            "user_id":    user_id,
            "title":      title,
            "body":       body,
            "is_read":    False,
            "created_at": _utcnow()
        }).execute()
    except Exception:
        pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)


