import json
import os

CONFIG_DIR = os.path.join(
    os.getenv("APPDATA"),
    "RulingSafe"
)
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")


def load_config():
    if not os.path.exists(CONFIG_FILE):
        return {}
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_config(data):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def get_base_path():
    return load_config().get("base_path")


def set_base_path(path):
    config = load_config()
    config["base_path"] = path
    save_config(config)


# =========================
# USER HELPERS (IMPORTANT)
# =========================

def get_users():
    return load_config().get("users", [])


def add_user(user):
    config = load_config()
    users = config.get("users", [])

    if any(u["username"] == user["username"] for u in users):
        raise ValueError("User already exists")

    users.append(user)
    config["users"] = users
    save_config(config)


def set_active_user(username):
    config = load_config()

    users = config.get("users", [])
    if not any(u["username"] == username for u in users):
        raise ValueError("User does not exist")

    config["active_user"] = username
    save_config(config)


def get_active_user():
    return load_config().get("active_user")
