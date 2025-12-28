# backend/document_manager.py

import os
import shutil
import webview
from backend.config_manager import get_base_path
from backend.app_state import get_active_user

def _documents_path(case_folder):
    base = get_base_path()
    user = get_active_user()
    return os.path.join(base, "users", user, case_folder, "documents")


def add_documents(case_folder):
    window = webview.windows[0]

    files = window.create_file_dialog(
        webview.OPEN_DIALOG,
        allow_multiple=True
    )

    if not files:
        return

    dest = _documents_path(case_folder)
    os.makedirs(dest, exist_ok=True)

    for f in files:
        shutil.copy2(f, dest)


def open_documents(case_folder):
    path = _documents_path(case_folder)
    os.makedirs(path, exist_ok=True)
    os.startfile(path)  # Windows
