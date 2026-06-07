#!/usr/bin/env pwsh
# One-off helper: create the "contributing" issues on GitHub.
#
# Prerequisites:
#   1. Official GitHub CLI installed (gh 2.x from cli.github.com / winget GitHub.cli).
#      NOTE: the deprecated npm "gh" (node-gh) package will NOT work. Uninstall it:
#          npm uninstall -g gh
#   2. Authenticated once:  gh auth login
#
# Usage (from repo root):
#   pwsh -File scripts/create-contributing-issues.ps1            # create the issues
#   pwsh -File scripts/create-contributing-issues.ps1 -DryRun    # print what would happen
#
# Safe to re-run for labels (already-exists is ignored), but it will create
# DUPLICATE issues if run twice. Run once.

[CmdletBinding()]
param(
  [string]$Repo = 'SamLizard/torah_roll_helper',
  [switch]$DryRun
)

$ErrorActionPreference = 'Continue'

# Resolve gh: prefer the official CLI, avoid the npm node-gh shim.
function Resolve-Gh {
  $candidates = @(
    (Join-Path $env:ProgramFiles 'GitHub CLI\gh.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'GitHub CLI\gh.exe')
  )
  foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { return $c } }

  $cmd = Get-Command gh -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  throw 'Official GitHub CLI (gh) not found. Install it from https://cli.github.com/ or: winget install --id GitHub.cli'
}

$gh = Resolve-Gh
Write-Host "Using gh: $gh"

# Sanity check: must be the official CLI and authenticated.
$ver = (& $gh --version 2>&1 | Out-String)
if ($ver -notmatch 'gh version') {
  throw "The 'gh' found does not look like the official GitHub CLI. Output: $ver"
}
& $gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Not authenticated. Run: gh auth login"
}

# --- Labels (color, description). Created if missing; existing ones are left as-is.
$labels = @(
  @{ name = 'enhancement'; color = 'a2eeef'; desc = 'New feature or request' },
  @{ name = 'help wanted';  color = '008672'; desc = 'Extra attention is needed' },
  @{ name = 'ocr';          color = 'd4c5f9'; desc = 'Photo / OCR / page recognition' },
  @{ name = 'research';     color = 'fef2c0'; desc = 'Needs investigation before code' },
  @{ name = 'discussion';   color = 'c5def5'; desc = 'Open design question' },
  @{ name = 'pwa';          color = '0e8a16'; desc = 'PWA / offline / persistence' },
  @{ name = 'data';         color = 'fbca04'; desc = 'Reading / page mapping data' },
  @{ name = 'calendar';     color = 'bfd4f2'; desc = 'Hebcal / reading calendar' },
  @{ name = 'design';       color = 'f9d0c4'; desc = 'UI / UX' }
)

Write-Host "`n=== Ensuring labels exist ===" -ForegroundColor Cyan
foreach ($l in $labels) {
  if ($DryRun) { Write-Host "[dry-run] label: $($l.name)"; continue }
  & $gh label create $l.name --repo $Repo --color $l.color --description $l.desc 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host "  created: $($l.name)" }
  else { Write-Host "  exists/skip: $($l.name)" -ForegroundColor DarkGray }
}

# --- Issues. Bodies kept in step with docs/contributing/ISSUE_DRAFTS.md.
$issues = @(
  @{
    title = 'Better / on-device OCR for the photo flow'
    labels = 'enhancement,help wanted,ocr'
    body = @'
**Problem**
Photo input relies on the external Dicta OCR + Parallels APIs, plus a local
Tesseract first-line matcher with fuzzy search over `page_first_lines.json`.
Accuracy on vocalized STA"M ksav and varied lighting/angles is the weak point,
and the Dicta dependency means that part of the app is not truly offline.

**Ask**
Looking for someone with strong OCR experience to propose a better pipeline:
- A model that reads vocalized Hebrew / Torah ksav reliably, ideally on-device.
- Combined with light fuzzy search over the per-layout first lines.

**Pointers**
- `src/composables/dictaApi.ts` - Dicta OCR + Parallels calls.
- `src/composables/firstLineOcr.ts` - Tesseract worker + fuzzy match + reliability.
- `src/composables/firstLineSearch.ts` - normalization + prepared first lines.
- Data: `src/data/<pageCount>/page_first_lines.json`.

**Constraints**
Frontend-only, prefer offline/PWA-friendly, in-browser (incl. mobile), RTL/Hebrew.
Accuracy beats coverage.
'@
  },
  @{
    title = 'Other ways to recognize the page the scroll is open on'
    labels = 'enhancement,research,ocr'
    body = @'
**Problem**
Reading the first line via photo is one approach. There may be better/faster ways
to detect which column a Sefer Torah is currently open to in a noisy shul setting.

**Ask**
Ideas and prototypes welcome: image matching against known columns, detecting
column boundaries/geometry, markers on the atzei chayim, audio of the reading,
manual landmarks, etc. Trade-offs in accuracy and effort appreciated.

**Constraints**
Frontend-only, offline-friendly preferred, fast enough to use mid-service.
'@
  },
  @{
    title = 'PWA persistent-use ideas'
    labels = 'enhancement,pwa,discussion'
    body = @'
**Problem**
The app is a PWA (`vite-plugin-pwa`) and persists a little state via
`pinia-plugin-persistedstate` (`src/stores/options.ts`,
`src/composables/storageKeys.ts`). We want installed/offline use to be genuinely
better, not just installable.

**Ask**
What should persistence enable? e.g. fully offline OCR assets, cached calendar,
remembering last-used FROM/TO, quick re-open of last result, install guidance.

**Constraints**
No server. Keep it working offline. Mind storage limits on mobile.
'@
  },
  @{
    title = '"My Sifrei Torah" - save and reuse scrolls'
    labels = 'enhancement,pwa,data'
    body = @'
**Problem**
A user often reads from the same physical scrolls. Today there is no way to save one.

**Proposal**
Let a user save a Sefer Torah (name + chosen layout, optionally reference text
and/or photo). When they pick a saved scroll, default the FROM side to the last
parasha placed on it - i.e. the previous reading's `refEnd` (see `refEnd` /
`refEndPartial` in `src/data/target_pages.json` and
`src/composables/readingTargets.ts`).

**Open questions**
- Storage: localStorage vs IndexedDB for images?
- How to record "last parasha placed" after a reading is completed?

**Constraints**
No server, offline-friendly.
'@
  },
  @{
    title = 'Auto-suggest which scroll to use, from calendar + rules'
    labels = 'enhancement,calendar'
    body = @'
**Problem**
With several saved scrolls (see "My Sifrei Torah"), choosing the right one each
time is manual.

**Proposal**
Let users define rules ("scroll A on Shabbat, scroll B for weekdays, scroll C for
festivals..."). Combine with the Hebcal-driven calendar
(`src/composables/calendar/`, `@hebcal/leyning`, `@hebcal/hdate`) to auto-propose a
scroll for the upcoming reading.

**Depends on:** "My Sifrei Torah - save and reuse scrolls".

**Constraints**
No server. Rules stored locally.
'@
  },
  @{
    title = 'Data portability - export / import / device-to-device share'
    labels = 'discussion,pwa,data'
    body = @'
**Question**
If user data (saved scrolls, rules, settings) lives only in browser storage, it is
fragile and trapped on one device. Should we:
- Export/import a JSON (and images) file?
- Share directly device-to-device (QR, Web Share, WebRTC, file)?
- Something else?

Maintainer preference is to stay server-less for now. Looking for opinions and a
recommended approach + format. Storage keys today are namespaced
`torah-roll-helper:*` (`src/composables/storageKeys.ts`).
'@
  },
  @{
    title = 'Rites / minhagim - what differs, so we can add more'
    labels = 'research,data,help wanted'
    body = @'
**Question**
Currently only `sefaradic` nusach exists (`NUSACH_OPTIONS` in
`src/stores/options.ts`). For someone who knows Hebcal and the relevant halachot:
what actually differs between rites for our purposes - reading divisions,
sheni/hamishi ends (`refEndPartial`), holiday readings, Israel vs Gola - so we can
model additional rites correctly?

See the README "Add a new nusach option" recipe and `src/data/target_pages.json`.
'@
  },
  @{
    title = 'UI/UX redesign proposal'
    labels = 'enhancement,design,help wanted'
    body = @'
**Ask**
Looking for a UI/UX designer to propose a cleaner look and smoother flow for the
two-sided FROM/TO workflow, the target browser, the camera flow, and the result
panel - across desktop and mobile, in LTR and RTL, in three+ languages.

Mockups or a Figma link welcome before code. Built on Vuetify 3; please keep
i18n/RTL in mind.
'@
  }
)

Write-Host "`n=== Creating issues in $Repo ===" -ForegroundColor Cyan
foreach ($i in $issues) {
  if ($DryRun) {
    Write-Host "[dry-run] would create: $($i.title)  [labels: $($i.labels)]"
    continue
  }
  $url = & $gh issue create --repo $Repo --title $i.title --body $i.body --label $i.labels
  if ($LASTEXITCODE -eq 0) { Write-Host "  created: $url" -ForegroundColor Green }
  else { Write-Host "  FAILED: $($i.title)" -ForegroundColor Red }
}

Write-Host "`nDone." -ForegroundColor Cyan
