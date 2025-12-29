import os
import json
import shutil
from datetime import datetime
from backend.config_manager import get_base_path, load_config, save_config


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


def create_user(username, first_name="", middle_name="", last_name=""):
    config = load_config()

    # Ensure users list exists
    users = config.get("users", [])

    # Check duplicate
    if any(u["username"] == username for u in users):
        raise ValueError("User already exists")

    user = {
        "username": username,
        "first_name": first_name,
        "middle_name": middle_name,
        "last_name": last_name
    }

    users.append(user)
    config["users"] = users

    save_config(config)
    
    # Also save to users.json file
    save_users(users)

    # Create user folder
    base_path = config.get("base_path")
    if base_path:
        user_path = os.path.join(base_path, "users", username)
        os.makedirs(user_path, exist_ok=True)
        os.makedirs(os.path.join(user_path, "cases"), exist_ok=True)

    return user


def delete_user(username):
    """Delete a user account, folder, and update config/users.json"""
    config = load_config()
    
    # Remove from config users list
    users = config.get("users", [])
    users = [u for u in users if u["username"] != username]
    config["users"] = users
    save_config(config)
    
    # Remove from users.json
    save_users(users)
    
    # Delete user folder
    base_path = config.get("base_path")
    if base_path:
        user_path = os.path.join(base_path, "users", username)
        if os.path.exists(user_path):
            shutil.rmtree(user_path)
    
    return {"status": "ok"}
