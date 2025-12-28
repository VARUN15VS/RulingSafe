import os
import json
import uuid
import shutil
from datetime import datetime
from backend.config_manager import get_base_path, load_config
from backend.app_state import get_active_user


def _ensure_context():
    base_path = get_base_path()
    user = get_active_user()

    if not base_path:
        raise RuntimeError("Base path not set")

    if not user:
        raise RuntimeError("No active user")

    user_root = os.path.join(base_path, "users", user)
    return user_root, user


def _cases_file():
    user_root, _ = _ensure_context()
    return os.path.join(user_root, "cases.json")


def _cases_dir():
    user_root, _ = _ensure_context()
    return os.path.join(user_root, "cases")

def load_cases():
    path = _cases_file()

    if not os.path.exists(path):
        return []

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # handle both formats safely
        if isinstance(data, dict):
            return data.get("cases", [])
        elif isinstance(data, list):
            return data
        else:
            return []

    except json.JSONDecodeError:
        # file exists but is empty/corrupted
        return []


def save_cases(cases):
    path = _cases_file()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"cases": cases}, f, indent=2)


def case_exists(case_name, year):
    cases = load_cases()
    key = f"{case_name.strip()}_{year}"
    return any(c["key"] == key for c in cases)


def create_case(data):
    case_name = data["case_name"].strip()
    year = data["year"].strip()
    court = data.get("court", "")
    result = data.get("result", "")
    description = data.get("description", "")
    case_no = data.get("case_no", "")

    key = f"{case_name}_{year}"

    if case_exists(case_name, year):
        raise ValueError("Case with same name and year already exists")

    now = datetime.now().isoformat()

    case = {
        "key": key,
        "case_no": case_no,
        "case_name": case_name,
        "year": year,
        "court": court,
        "result": result,
        "description": description,
        "created_at": now,
        "last_updated": now
    }

    cases = load_cases()
    cases.append(case)
    save_cases(cases)

    # Create folder structure
    cases_root = _cases_dir()
    case_folder = os.path.join(cases_root, key)
    os.makedirs(os.path.join(case_folder, "documents"), exist_ok=True)

    return case


# =========================================================
# INTERNAL HELPERS
# =========================================================

def _links_file(case_folder: str) -> str:
    """
    Returns absolute path to links.json inside a case folder
    """
    return os.path.join(case_folder, "links.json")


def _safe_read_json(path: str) -> dict:
    """
    Safely read JSON file.
    Returns empty structure if file is missing or corrupted.
    """
    if not os.path.exists(path):
        return {"links": []}

    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return {"links": []}
            return json.loads(content)
    except (json.JSONDecodeError, OSError):
        # Never crash the app because of bad JSON
        return {"links": []}


def _safe_write_json(path: str, data: dict):
    """
    Atomically write JSON to disk
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# =========================================================
# PUBLIC API
# =========================================================

def load_links(case_folder: str) -> list:
    """
    Load all links for a case
    """
    path = _links_file(case_folder)
    data = _safe_read_json(path)
    return data.get("links", [])


def add_case_link(case_folder: str, title: str, url: str, platform: str = ""):
    """
    Add a new link to the case
    """
    path = _links_file(case_folder)
    data = _safe_read_json(path)

    new_link = {
        "id": str(uuid.uuid4()),
        "title": title.strip(),
        "url": url.strip(),
        "platform": platform.strip(),
        "created_at": datetime.now().isoformat()
    }

    data.setdefault("links", []).append(new_link)
    _safe_write_json(path, data)

    return new_link


def delete_case_link(case_folder: str, link_id: str) -> bool:
    """
    Delete a link by ID
    Returns True if deleted, False otherwise
    """
    path = _links_file(case_folder)
    data = _safe_read_json(path)

    original_len = len(data.get("links", []))
    data["links"] = [l for l in data.get("links", []) if l["id"] != link_id]

    if len(data["links"]) == original_len:
        return False  # nothing deleted

    _safe_write_json(path, data)
    return True

def get_case_folder(case_key: str) -> str:
    base_path = get_base_path()
    user = get_active_user()

    if not base_path:
        raise RuntimeError("Base path not set")
    if not user:
        raise RuntimeError("No active user")

    case_folder = os.path.join(
        base_path,
        "users",
        user,
        "cases",
        case_key
    )

    if not os.path.exists(case_folder):
        raise RuntimeError(f"Case folder not found: {case_key}")

    return case_folder

def update_case(old_key: str, data: dict):
    cases = load_cases()
    case = next((c for c in cases if c["key"] == old_key), None)

    if not case:
        raise ValueError("Case not found")

    new_name = data["case_name"].strip()
    new_year = data["year"].strip()
    new_key = f"{new_name}_{new_year}"

    # Clash check
    if new_key != old_key and any(c["key"] == new_key for c in cases):
        raise ValueError("Another case with same name and year exists")

    # Rename folder if key changed
    if new_key != old_key:
        old_folder = os.path.join(_cases_dir(), old_key)
        new_folder = os.path.join(_cases_dir(), new_key)
        os.rename(old_folder, new_folder)
        case["key"] = new_key

    case.update({
        "case_no": data.get("case_no", ""),
        "case_name": new_name,
        "year": new_year,
        "court": data.get("court", ""),
        "description": data.get("description", ""),
        "last_updated": datetime.now().isoformat()
    })

    save_cases(cases)
    return case

def delete_case(case_key: str):
    cases = load_cases()
    cases = [c for c in cases if c["key"] != case_key]
    save_cases(cases)

    case_folder = os.path.join(_cases_dir(), case_key)
    if os.path.exists(case_folder):
        shutil.rmtree(case_folder)

    return True