import os
import webview

from backend.config_manager import set_base_path, get_base_path
from backend.user_manager import create_user
from backend.app_state import set_active_user, has_user
from backend.case_manager import create_case, load_cases


class Api:
    # ==========================
    # STORAGE LOCATION
    # ==========================
    def pick_storage_location(self):
        folder = webview.windows[0].create_file_dialog(
            webview.FOLDER_DIALOG,
            directory=""
        )

        if not folder:
            return {"status": "cancelled"}

        base_path = os.path.join(folder[0], "RulingSafe")

        os.makedirs(base_path, exist_ok=True)
        os.makedirs(os.path.join(base_path, "users"), exist_ok=True)

        set_base_path(base_path)

        return {"status": "ok", "base_path": base_path}

    def has_base_path(self):
        return bool(get_base_path())

    # ==========================
    # USER MANAGEMENT
    # ==========================
    def create_user(self, data):
        user = create_user(
            data["username"],
            data.get("first_name", ""),
            data.get("middle_name", ""),
            data.get("last_name", "")
        )

        set_active_user(user["username"])
        return {"status": "ok", "user": user}

    def has_user(self):
        return has_user()
    
    # ==========================
    # CASE / RULING MANAGEMENT
    # ==========================
    def create_case(self, data):
        case = create_case(data)
        return {"status": "ok", "case": case}

    def get_cases(self):
        return {"status": "ok", "cases": load_cases()}



api = Api()

window = webview.create_window(
    title="RulingSafe",
    url="frontend/index.html",
    js_api=api,
    width=1200,
    height=800
)

webview.start()
