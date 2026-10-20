# 🔑 Selective LocalStorage Purger

> A lightweight, zero-bloat Manifest V3 browser extension for developers to inspect, filter, and surgically purge `localStorage` and `sessionStorage` keys without destroying authentication cookies or resetting user sessions.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-22d3ee?style=for-the-badge&logo=googlechrome&logoColor=white)
![Browser Support](https://img.shields.io/badge/Compatibility-Chrome%20%7C%20Brave-10b981?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-a855f7?style=for-the-badge)

---

##  Features

-  **Surgical Key Wiping:** Delete individual keys or bulk-purge matching filter patterns with one click. Keeps `auth_token`, session cookies, and login states completely intact.
-  **Multi-Keyword & Wildcard Matching:** Instant evaluation supporting wildcard queries (e.g., `draft_*`) and comma-separated lists (e.g., `draft, temp, autosave, input`).
-  **Preset Filter Chips:** One-tap presets for targeting common local storage clutter:
  -  **Drafts:** `draft, temp, autosave, input, form, edit`
  -  **Search:** `search, query, history, recent, filter`
  -  **Modals:** `banner, modal, popup, dismiss, seen, notice, dialog, cookie, tour`
-  **Global Hotkey:** Toggle the extension popup instantly across any active site using `Alt + Shift + X`.
-  **Privacy-First Architecture:** Executes 100% locally in browser memory using standard `activeTab` and `scripting` APIs — zero tracking or network overhead.

---

##  Installation (Developer Mode)

Since this is an open-source utility, you can install it for free in **Chrome**, **Brave**, **Edge**, or any Chromium browser:

1. **Clone or Download this repository:**
   ```bash
   git clone [https://github.com/erfanhkimi/storage-purger.git](https://github.com/erfanhkimi/storage-purger.git)
