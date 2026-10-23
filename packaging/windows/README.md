# Windows package build

The setup compiles a small .NET Framework tray host and bundles Node.js with the app.

1. Place the official x64 Node.js runtime files in `packaging/windows/payload/runtime/`. At minimum this folder needs `node.exe` and `LICENSE.node.txt` (including the Node.js license and third-party notices).
2. Install Inno Setup 6 or later and .NET Framework 4.x. The script looks in the default machine-wide and per-user install folders; `ISCC.exe` can also be selected with the `INNO_SETUP_COMPILER` environment variable.
3. From the repository root, run `powershell -ExecutionPolicy Bypass -File packaging/windows/build.ps1`.

The output is written to `packaging/windows/dist/`: the versioned setup EXE, uninstall helper, complete portable ZIP and `SHA256SUMS.txt`. Do not distribute the tray EXE on its own; it needs `app/` and `runtime/` alongside it. The runtime and build output are ignored by Git. The release build includes the configured `config.json`; review it before distributing a custom build.


Release 1.1.4 uses the official Node.js 22.23.4 x64 ZIP from nodejs.org. Verify it against the matching official `SHASUMS256.txt`; copy its `node.exe` and `LICENSE` (renamed to `LICENSE.node.txt`) into the runtime folder. The Node.js binary retains its upstream Authenticode signature. The project launcher, setup and uninstall helper are unsigned; no trusted signing certificate is configured. This can still cause SmartScreen/Smart App Control warnings or blocks. Do not remove safety filters, obfuscate payloads or add antivirus exclusions to address a report. Record the exact detection and hash instead.

The build runs the packaged engine's `--check` before compiling. After building, run `AutoAcceptLite.exe --check` from an extracted portable folder and verify exit code 0. `AppVersion` and artifact names come from `package.json`; keep the assembly and manifest versions in sync.
