// AutoAccept Lite — Antigravity'nin CDP portunu acik baslatmasini saglar.
// Tek sorumluluk: kisayollara hata ayiklama bayragini eklemek ve calisan
// Antigravity'nin bu bayrakla acilip acilmadigini soylemek (yalniz Windows).
//
// Antigravity 44.9.1 (2026-11) oncesi `remote-debugging-port=0` anahtarini
// kendisi ekliyordu. Artik yalniz komut satirinda `--remote-debugging-port`
// verilirse CDP acar; verilmezse `DevToolsActivePort` dosyasini da siler.

const { execFile } = require('child_process');
const path = require('path');

// PATH'e guvenme: bazi kabuklarda (Git Bash, kisitli ortam) powershell.exe PATH'te yok.
const POWERSHELL = path.join(process.env.SystemRoot || 'C:\\Windows',
    'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

/** Kisayola eklenen bayrak. 0 = rastgele bos port, DevToolsActivePort'a yazilir. */
const FLAG = '--remote-debugging-port=0';

/**
 * Yalniz GECERLI KULLANICININ Baslat menusu, masaustu ve gorev cubugu
 * sabitlerindeki `Antigravity.exe` kisayollarini gezen betigi uretir.
 * Tum kullanicilarin ortak kisayollarina (ProgramData, Public) bilerek
 * dokunulmaz: CDP portu baska bir Windows hesabinda acilmamali.
 * Antigravity IDE'nin kisayollari da atlanir. Ciktisi degistirilen
 * kisayollarin yollaridir; yazilamayan kisayol sessizce atlanir.
 * @param {'add'|'remove'} mode 'add' bayragi ekler (varsa dokunmaz),
 *   'remove' yalniz tam `--remote-debugging-port=0` parcasini siler.
 * @returns {string} PowerShell betigi
 */
function shortcutScript(mode) {
    const change = mode === 'add'
        ? `if ($l.Arguments -match '--remote-debugging-port') { return }
    $l.Arguments = ($l.Arguments + ' ${FLAG}').Trim()`
        : `$new = ($l.Arguments -replace '(^|\\s)${FLAG}(?=\\s|$)', '').Trim()
    if ($new -eq $l.Arguments) { return }
    $l.Arguments = $new`;
    return `
$ErrorActionPreference = 'SilentlyContinue'
$sh = New-Object -ComObject WScript.Shell
$dirs = @(
  [Environment]::GetFolderPath('Programs'),
  [Environment]::GetFolderPath('DesktopDirectory'),
  (Join-Path $env:APPDATA 'Microsoft\\Internet Explorer\\Quick Launch\\User Pinned')
)
foreach ($d in $dirs) {
  if (-not $d -or -not (Test-Path $d)) { continue }
  Get-ChildItem -LiteralPath $d -Recurse -Filter *.lnk | ForEach-Object {
    $l = $sh.CreateShortcut($_.FullName)
    if ([IO.Path]::GetFileName($l.TargetPath) -ne 'Antigravity.exe') { return }
    ${change}
    try { $l.Save(); $_.FullName } catch { }
  }
}`;
}

/**
 * Ana (tarayici) Antigravity surecinin komut satirini yazar. Ana surec,
 * `--type=` alan Chromium yardimcilarinin ebeveynidir; ayni exe'yi Node
 * olarak calistiran sidecar surecleri (`--import=...`) boylece elenir.
 */
const MAIN_CMDLINES_PS = `
$p = @(Get-CimInstance Win32_Process -Filter "Name='Antigravity.exe'")
$parents = $p | Where-Object { $_.CommandLine -match '--type=' } | ForEach-Object { $_.ParentProcessId }
$p | Where-Object { $parents -contains $_.ProcessId } | ForEach-Object { $_.CommandLine }`;

/**
 * PowerShell betigini tirnak kacisi derdi olmadan calistirir.
 * @param {string} script
 * @returns {Promise<string[]>} bos olmayan cikti satirlari (calismazsa bos dizi)
 */
function runPs(script) {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    return new Promise((resolve) => {
        execFile(POWERSHELL, ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
            { windowsHide: true, timeout: 15000 },
            // Atlanan tek bir hata (erisilemeyen klasor vb.) ya da stderr'e dusen
            // CLIXML ilerleme kaydi cikis kodunu bozar; gecerli stdout yine kullanilir.
            (err, stdout) => resolve(String(stdout || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)));
    });
}

/**
 * Antigravity kisayollarina CDP bayragini ekler. Windows disinda bir sey yapmaz.
 * Her acilista cagrilabilir: Antigravity guncellemesi kisayolu yeniden
 * yazarsa bayrak tekrar eklenir.
 * @returns {Promise<string[]>} bu cagride degistirilen kisayollarin yollari
 */
async function ensureShortcutFlag() {
    if (process.platform !== 'win32') return [];
    return runPs(shortcutScript('add'));
}

/**
 * Kaldirma sirasinda calisir: kisayollardaki `--remote-debugging-port=0`
 * parcasini siler ve Antigravity'yi eski haline birakir. Kullanicinin elle
 * verdigi baska bir port (`=9222` gibi) korunur. Windows disinda bir sey yapmaz.
 * @returns {Promise<string[]>} bayragi kaldirilan kisayollarin yollari
 */
async function removeShortcutFlag() {
    if (process.platform !== 'win32') return [];
    return runPs(shortcutScript('remove'));
}

/**
 * Calisan Antigravity'nin CDP durumunu soyler.
 * 'noFlag' durumunda kullanicinin Antigravity'yi tamamen kapatip kisayoldan
 * acmasi gerekir; calisan surece port sonradan eklenemez.
 * @returns {Promise<'notRunning'|'noFlag'|'flagged'|'unknown'>}
 *   'unknown': Windows disi. Surec listesi okunamazsa 'notRunning' doner.
 */
async function antigravityDebugState() {
    if (process.platform !== 'win32') return 'unknown';
    const lines = await runPs(MAIN_CMDLINES_PS);
    if (!lines.length) return 'notRunning';
    return lines.some((l) => l.includes('--remote-debugging-port')) ? 'flagged' : 'noFlag';
}

module.exports = { ensureShortcutFlag, removeShortcutFlag, antigravityDebugState, FLAG };
