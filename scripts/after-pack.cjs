const { spawnSync } = require('node:child_process');

/**
 * electron-builder can leave an unsigned Electron executable's linker
 * signature in place when no Apple Developer identity is available. That
 * signature is not a valid signature for the containing .app bundle and
 * macOS may report that the app was modified or damaged.
 *
 * Sign the complete bundle ad hoc after electron-builder has assembled it,
 * before the DMG/ZIP targets are created. This does not provide Apple
 * Developer ID trust or notarization, but it does make the bundle internally
 * consistent and lets Gatekeeper show the normal unidentified-developer
 * warning instead of the misleading "modified/damaged" error.
 */
if (process.platform !== 'darwin') {
  module.exports = async () => {};
} else {
  module.exports = async function afterPack(context) {
    const appPath = context.appOutDir;
    const result = spawnSync('/usr/bin/codesign', [
      '--force',
      '--deep',
      '--sign',
      '-',
      appPath,
    ], { stdio: 'inherit' });

    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Ad-hoc signing failed with exit code ${result.status}`);
    }

    const verify = spawnSync('/usr/bin/codesign', [
      '--verify',
      '--deep',
      '--strict',
      '--verbose=2',
      appPath,
    ], { stdio: 'inherit' });

    if (verify.error) throw verify.error;
    if (verify.status !== 0) {
      throw new Error(`Signed app verification failed with exit code ${verify.status}`);
    }
  };
}
