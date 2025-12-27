import os
import json
from datetime import datetime
from backend.config_manager import get_base_path


def _ensure_base_path():
    base_path = get_base_path()
    if not base_path:
        raise RuntimeError("Base path is not set. Select storage location first.")
    return base_path


def _users_file():
    base_path = _ensure_base_path()
    return os.path.join(base_path, "users.json")


def _users_dir():
    base_path = _ensure_base_path()
    return os.path.join(base_path, "users")


def load_users():
    path = _users_file()
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f).get("users", [])


def save_users(users):
    path = _users_file()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"users": users}, f, indent=2)


def username_exists(username: str) -> bool:
    users = load_users()
    if any(u["username"] == username for u in users):
        return True

    user_folder = os.path.join(_users_dir(), username)
    return os.path.exists(user_folder)


def create_user(username, first, middle, last):
    if username_exists(username):
        raise ValueError("Username already exists")

    user = {
        "username": username,
        "first_name": first,
        "middle_name": middle,
        "last_name": last,
        "created_at": datetime.now().isoformat()
    }

    # Save user in users.json
    users = load_users()
    users.append(user)
    save_users(users)

    # Create folder structure
    user_path = os.path.join(_users_dir(), username)
    cases_path = os.path.join(user_path, "cases")

    os.makedirs(cases_path, exist_ok=True)

    print("User folder created at:", user_path)

    return user
