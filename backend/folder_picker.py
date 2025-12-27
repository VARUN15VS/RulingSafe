import os
from tkinter import Tk, filedialog
from backend.config_manager import set_base_path


def pick_folder():
    root = Tk()
    root.withdraw()

    folder = filedialog.askdirectory(
        title="Select folder to store RulingSafe data"
    )

    root.destroy()

    if not folder:
        return None

    base_path = os.path.join(folder, "RulingSafe")

    os.makedirs(base_path, exist_ok=True)
    os.makedirs(os.path.join(base_path, "users"), exist_ok=True)

    set_base_path(base_path)
    return base_path
