from backend.config_manager import load_config, save_config


def set_active_user(username: str):
    config = load_config()
    config["active_user"] = username
    save_config(config)


def get_active_user():
    return load_config().get("active_user")


def clear_active_user():
    config = load_config()
    config.pop("active_user", None)
    save_config(config)


def has_user() -> bool:
    return get_active_user() is not None
