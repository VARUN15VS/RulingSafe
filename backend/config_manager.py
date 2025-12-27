import json
import os

CONFIG_DIR = os.path.join(os.getcwd(), "config")
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