import os
import json
from datetime import datetime
from backend.config_manager import get_base_path
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
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f).get("cases", [])


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
