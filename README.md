# AetherFetch Extension

Quick access to [AetherFetch](https://aetherfetch.vercel.app/) from Microsoft Edge and Mozilla Firefox.

The popup opens your inbox, saved accounts, account creation, or the guide. It uses your existing AetherFetch browser session. No API key, mailbox permission, or background process is needed.

## Install in Edge

1. Download this repository as a ZIP and extract it.
2. Open `edge://extensions`, enable **Developer mode**, and select **Load unpacked**.
3. Select the extracted folder containing `manifest.json`.

## Install in Firefox

1. Download this repository as a ZIP and extract it.
2. Open `about:debugging#/runtime/this-firefox` and select **Load Temporary Add-on**.
3. Select `manifest.json` in the extracted folder. Firefox removes temporary add-ons when it restarts; permanent installation requires a signed extension package.

This is a shortcut to the web app, so an internet connection and the live AetherFetch service are required. It does not create addresses directly inside the popup.

## License

MIT. Created by **qbpg**.
