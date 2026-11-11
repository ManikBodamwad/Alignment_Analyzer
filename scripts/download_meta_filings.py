#!/usr/bin/env python3
"""
Utility script to download all official Meta filings and reports
from the linked Google Drive folder into data/meta_filings/.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

FOLDER_ID = "1eFvJQyv5zEvzD0A7ngjdy_bacJZ0JRlg"
TARGET_DIR = Path("data/meta_filings")


def main():
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[*] Querying Google Drive folder {FOLDER_ID}...")

    cmd_list = ["gdrive", "readonly", "ls", FOLDER_ID, "--json"]
    proc = subprocess.run(cmd_list, capture_output=True, text=True)
    if proc.returncode != 0:
        print(f"[!] Error listing folder: {proc.stderr}")
        sys.exit(1)

    try:
        files = json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        print(f"[!] Failed to parse JSON list from gdrive: {e}")
        print(proc.stdout)
        sys.exit(1)

    print(f"[*] Found {len(files)} files in folder. Beginning sync to {TARGET_DIR}...\n")

    success_count = 0
    skipped_count = 0

    for idx, item in enumerate(files, start=1):
        file_id = item["id"]
        raw_name = item["name"]
        # Sanitize filename
        safe_name = raw_name.replace("/", "_").replace("\\", "_")
        dest_path = TARGET_DIR / safe_name
        expected_size = int(item.get("size", 0))

        # Check if already downloaded
        if dest_path.exists() and (expected_size == 0 or dest_path.stat().st_size == expected_size):
            print(f"[{idx}/{len(files)}] [EXISTS] {safe_name} ({dest_path.stat().st_size / 1024:.1f} KB)")
            skipped_count += 1
            continue

        print(f"[{idx}/{len(files)}] [DOWNLOADING] {safe_name} ({expected_size / 1024:.1f} KB)...")
        dl_cmd = ["gdrive", "readonly", "download", file_id, "--out", str(dest_path)]
        dl_proc = subprocess.run(dl_cmd, capture_output=True, text=True)

        if dl_proc.returncode == 0:
            actual_size = dest_path.stat().st_size
            print(f"   -> [SAVED] {safe_name} ({actual_size / 1024:.1f} KB)")
            success_count += 1
        else:
            print(f"   -> [FAILED] {safe_name}: {dl_proc.stderr.strip()}")

    print(f"\n[+] Sync Complete: {success_count} downloaded, {skipped_count} already present, total {len(files)}.")


if __name__ == "__main__":
    main()

