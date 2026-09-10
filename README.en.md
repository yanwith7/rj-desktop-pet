# RJ Desktop Pet

[中文](README.md) · [English](README.en.md) · [Download the latest release](https://github.com/yanwith7/rj-desktop-pet/releases/latest)

RJ is a small cross-platform desktop pet for macOS and Windows. It runs in a transparent, borderless, always-on-top window and is built around the approved plush RJ sprite atlas.

## Download

Choose the file that matches your computer on the [Releases page](https://github.com/yanwith7/rj-desktop-pet/releases/latest):

| Your computer | Download | Notes |
| --- | --- | --- |
| Apple-silicon Mac (M1/M2/M3/M4) | `mac-arm64.dmg` | Recommended for most recent Macs. |
| Intel Mac | `mac-x64.dmg` | For Intel-based Macs. |
| Typical Windows 10/11 PC | `win-x64.exe` | Recommended for Intel/AMD PCs. |
| Windows on ARM | `win-arm64.exe` | For Snapdragon and similar ARM PCs. |

The Mac `.zip` files contain the same app as the `.dmg` files. After starting RJ, right-click the pet, open **Settings**, and choose **中文** or **English** at any time.

## Interactions

- Drag RJ anywhere on your desktop and resize it from 72–300 px.
- Click the head for a shy, happy head nod that restores energy.
- Click elsewhere for a wave; right-click for actions and settings.
- Choose working, jumping, spinning, walking left/right, or Yahoo! from the pixel-style menu.
- Toggle the pink energy bar, speech bubble, launch at login, or temporarily hide RJ.

The energy bar slowly decreases over time and while RJ performs actions. Head pats restore energy.

## First launch

The current public builds are not yet code-signed. macOS may require Control-clicking the app and choosing **Open**. Windows may show SmartScreen; choose **More info** and then **Run anyway** only after downloading from this repository's Release page.

## Build from source

Requires Node.js 20+ and pnpm:

```bash
pnpm install
pnpm start
```

Pushing a `v*` tag triggers GitHub Actions to build and publish macOS and Windows releases automatically.

## License

MIT
