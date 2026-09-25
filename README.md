<p align="center"><img src="logo.svg" alt="AetherFetch logo" width="68"></p>

# AetherFetch Extension

<p align="center">
  <a href="https://addons.mozilla.org/"><img alt="Mozilla" src="https://img.shields.io/badge/Mozilla-compatible-111111?style=for-the-badge&logo=mozilla&logoColor=white"></a>
  <a href="https://librewolf.net/"><img alt="LibreWolf" src="https://img.shields.io/badge/LibreWolf-compatible-111111?style=for-the-badge&logo=librewolf&logoColor=white"></a>
  <a href="#microsoft-edge"><img alt="Microsoft Edge" src="https://img.shields.io/badge/Microsoft%20Edge-manual%20install-111111?style=for-the-badge&logo=microsoftedge&logoColor=white"></a>
  <a href="https://vercel.com/"><img alt="Vercel" src="https://img.shields.io/badge/Vercel-web%20app-111111?style=for-the-badge&logo=vercel&logoColor=white"></a>
</p>

![AetherFetch extension banner](banner.png)

Create a temporary inbox right in your browser. Copy the address into a sign-up form, read incoming mail, copy verification codes, and open links from messages. Built for Mozilla-based browsers and Microsoft Edge.

## What it does

- Create several temporary addresses, each with an optional label.
- Read messages and open links from plain-text or HTML email.
- Click **Open dashboard** to add the extension's addresses to [AetherFetch](https://aetherfetch.vercel.app/) in the same browser profile. The selected address becomes the active website session. Existing website accounts and their favorites or archived state are preserved.
- Refresh while the popup is open, with cached results and a countdown when the mail service is rate limited.

Addresses are shared with the website **when you click Open dashboard**. The extension only accesses the AetherFetch domain. It does not inject code into the other websites you visit.

## Install

### Mozilla browsers (Firefox and LibreWolf)

The Mozilla Add-ons listing is not available yet. To test the extension temporarily, extract the [latest release ZIP](https://github.com/qbpg/aetherfetch-extension/releases/latest), open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and choose `manifest.json`. Temporary add-ons disappear after a browser restart. Permanent installation needs Mozilla signing.

### Microsoft Edge

Download the [latest release ZIP](https://github.com/qbpg/aetherfetch-extension/releases/latest), extract it, open `edge://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the folder containing `manifest.json`. Edge installation is by files; this project has no Edge Add-ons listing.

Open AetherFetch from the toolbar. Opening `popup.html` directly does not grant extension permissions.

## Privacy

The extension stores its addresses, labels, generated passwords, and access tokens in browser `storage.local`. It uses AetherFetch's existing mail.tm-backed API. When you click **Open dashboard**, it copies those accounts to the website's own `localStorage` and activates the selected session. Anyone with access to your browser profile may be able to access saved inboxes. Avoid temporary email for important or long-term accounts. See [Privacy details](PRIVACY.md).

## License

[MIT](LICENSE) · Created by **qbpg**.
