# Privacy

AetherFetch Extension creates temporary mailboxes directly with mail.tm. Account creation transmits the generated address and password to mail.tm. Reading an inbox transmits its access token and receives message information. The extension does not collect analytics or send browsing history.

The extension stores generated addresses, optional labels, passwords, access tokens, and cached mailbox summaries locally in the browser profile using `storage.local`. Mail bodies are requested when you open a message and are not saved in extension storage. It requests host access to `https://api.mail.tm/*` for mailbox requests and `https://aetherfetch.vercel.app/*` for the dashboard transfer.

Clicking **Open dashboard** copies the extension's saved accounts into that website's `localStorage` and activates the selected account. This is a user-initiated action on the AetherFetch domain. Other websites are not accessed. The extension shows link destinations before opening links from messages.

Removing the extension clears its browser storage. Website data can be cleared separately through browser site-data settings. Temporary inboxes should not be used for sensitive or long-term accounts.

Created by **qbpg**.
