# Privacy

AetherFetch Extension creates temporary mailboxes through the AetherFetch website API, which currently forwards requests to mail.tm. Account creation transmits the generated address and password to that service. Reading an inbox transmits its access token and receives message information. The extension does not collect analytics or send browsing history.

The extension stores generated addresses, optional labels, passwords, access tokens, cached mailbox summaries, and rate-limit timing locally in the browser profile using `storage.local`. Mail bodies are requested when you open a message and are not saved in extension storage. The extension only requests host access to `https://aetherfetch.vercel.app/*`.

Clicking **Open dashboard** copies the extension's saved accounts into that website's `localStorage` and activates the selected account. This is a user-initiated action on the AetherFetch domain. Other websites are not accessed. The extension shows link destinations before opening links from messages.

Removing the extension clears its browser storage. Website data can be cleared separately through browser site-data settings. Temporary inboxes should not be used for sensitive or long-term accounts.

Created by **qbpg**.
