import os
import webview
from datetime import datetime

from backend.config_manager import set_base_path, get_base_path, get_users, load_config
from backend.user_manager import create_user, delete_user
from backend.app_state import set_active_user, has_user, get_active_user, clear_active_user
from backend.case_manager import create_case, load_cases, load_links, delete_case_link,  add_case_link, get_case_folder, delete_case, update_case


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

    def get_current_user(self):
        username = get_active_user()
        if not username:
            return {"status": "error", "message": "No active user"}
        
        users = get_users()
        user = next((u for u in users if u["username"] == username), None)
        return {"status": "ok", "user": user}

    def get_all_users(self):
        """Get list of all users"""
        return {"status": "ok", "users": get_users()}

    def switch_user(self, username):
        """Switch to a different user"""
        users = get_users()
        if not any(u["username"] == username for u in users):
            return {"status": "error", "message": "User not found"}
        
        set_active_user(username)
        return {"status": "ok"}
    
    def delete_account(self):
        """Delete current user and switch to another or clear active user"""
        username = get_active_user()
        if not username:
            return {"status": "error", "message": "No active user"}
        
        delete_user(username)
        
        # Get remaining users
        users = get_users()
        
        if users:
            # Switch to first remaining user
            next_user = users[0]["username"]
            set_active_user(next_user)
            return {"status": "ok", "action": "switch_user", "next_user": next_user}
        else:
            # No users left, clear active user
            clear_active_user()
            return {"status": "ok", "action": "no_users"}
    
    # ==========================
    # CASE / RULING MANAGEMENT
    # ==========================
    def create_case(self, data):
        case = create_case(data)
        return {"status": "ok", "case": case}

    def get_cases(self):
        return {"status": "ok", "cases": load_cases()}
    
    def add_documents(self, data):
        case_key = data["caseKey"]
        folder = get_case_folder(case_key)

        from backend.document_manager import add_documents
        add_documents(folder)

        return {"status": "ok"}

    def open_documents(self, data):
        case_key = data["caseKey"]
        folder = get_case_folder(case_key)

        from backend.document_manager import open_documents
        open_documents(folder)

        return {"status": "ok"}

    

    # ==========================
    # LINKS MANAGEMENT
    # ==========================

    def get_links(self, data):
        folder = get_case_folder(data["caseKey"])
        return {"status": "ok", "links": load_links(folder)}

    def add_link(self, data):
        folder = get_case_folder(data["caseKey"])
        link = add_case_link(
            folder,
            data["title"],
            data["url"],
            data.get("platform", "")
        )
        return {"status": "ok", "link": link}

    def delete_link(self, data):
        folder = get_case_folder(data["caseKey"])
        deleted = delete_case_link(folder, data["id"])
        return {"status": "ok", "deleted": deleted}
    
    def open_external(self, url):
        import webbrowser
        webbrowser.open(url)
        return {"status": "ok"}


    # MODIFY AND DELETE CASE
    def update_case(self, data):
        try:
            case = update_case(data["old_key"], data)
            return {"status": "ok", "case": case}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def delete_case(self, data):
        delete_case(data["key"])
        return {"status": "ok"}

    # Window control APIs (for frameless titlebar)
    def set_window(self, win):
        self._window = win

    def minimize(self):
        try:
            self._window.minimize()
            return {"status": "ok"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def maximize(self):
        try:
            if hasattr(self._window, 'is_maximized') and self._window.is_maximized():
                self._window.restore()
            else:
                self._window.maximize()
            return {"status": "ok"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def close(self):
        try:
            self._window.destroy()
            return {"status": "ok"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def is_frameless(self):
        cfg = load_config()
        return bool(cfg.get("frameless_titlebar", False))


api = Api()

cfg = load_config()
frameless = bool(cfg.get("frameless_titlebar", False))

window = webview.create_window(
    title="RulingSafe",
    url="frontend/index.html",
    js_api=api,
    width=1200,
    height=800,
    frameless=frameless
)

api.set_window(window)

webview.start()
