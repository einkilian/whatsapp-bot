# WhatsApp-Bot

Ein einfacher WhatsApp-Bot mit `whatsapp-web.js`.

Voraussetzungen

- Node.js (16+ empfohlen)

Installation

```powershell
npm install
```

Start

```powershell
npm start
```

Beim ersten Start wird ein QR-Code im Terminal angezeigt. Scanne ihn mit WhatsApp (Einstellungen -> Verknüpfte Geräte -> Gerät verknüpfen).

API Endpoints

- POST /send { chatId, message } - sendet eine Nachricht an `chatId`
- GET /chats - listet bekannte Chats mit `id` und `name`

Hinweise

- Session-Daten werden in `./session` gespeichert.
- Auf Windows kann Puppeteer zusätzlichen Platzbedarf haben; falls Chromium nicht automatisch funktioniert, installiere `puppeteer` oder setze `PUPPETEER_EXECUTABLE_PATH` auf eine vorhandene Chrome/Chromium-Executable.
