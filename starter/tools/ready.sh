#!/usr/bin/env bash
# Northwind workshop readiness check (macOS / Linux).
# Run from the workshop folder:  bash tools/ready.sh
# It only reads versions, then initializes Git for this folder if needed. It installs nothing.

set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root" || exit 1

printf '\nNorthwind workshop - readiness check\nFolder: %s\n\n' "$root"

if [ ! -f "knowledge-docs/business-case.md" ]; then
  echo "This does not look like the workshop folder (knowledge-docs/business-case.md is missing)."
  echo "Open a terminal in the folder you saved from the guide and run the script again."
  exit 1
fi

row() { printf '%-24s %-22s %-14s %s\n' "$1" "$2" "$3" "$4"; }
first() { "$@" 2>/dev/null | head -n 1; }

row "TOOL" "NEEDED FOR" "STATUS" "DETAIL"
has_git=0
if command -v git >/dev/null 2>&1; then has_git=1; row "Git" "All parts" "OK" "$(first git --version)"
else row "Git" "All parts" "MISSING" "Install: brew install git"; fi

if command -v pwsh >/dev/null 2>&1; then row "PowerShell 7+" "All parts" "OK" "$(first pwsh --version)"
else row "PowerShell 7+" "All parts" "MISSING" "Scribe ledger and routing need it: brew install --cask powershell"; fi

if command -v copilot >/dev/null 2>&1; then
  row "GitHub Copilot CLI" "CLI client only" "OK" "$(first copilot --version)"
  plugins="$(copilot plugin list 2>&1)"
  squad=0; core=0
  echo "$plugins" | grep -q 'hve-squad@hve-squad-plugin' && squad=1
  echo "$plugins" | grep -q 'hve-squad-hve-core@hve-squad-plugin' && core=1
  if [ $squad -eq 1 ] && [ $core -eq 1 ]; then
    version="$(echo "$plugins" | sed -n 's/.*hve-squad@hve-squad-plugin *(v\{0,1\}\([0-9][0-9.]*\)).*/\1/p' | head -n 1)"
    case "$version" in
      ''|0.18.*) row "HVE Squad plugin pair" "CLI client only" "OK" "hve-squad v$version + hve-squad-hve-core installed" ;;
      *) row "HVE Squad plugin pair" "CLI client only" "WRONG VERSION" "hve-squad v$version - the guide is built for 0.18.0 (Part 00, step 3)" ;;
    esac
  elif [ $squad -eq 1 ] || [ $core -eq 1 ]; then row "HVE Squad plugin pair" "CLI client only" "INCOMPLETE" "Install both entries (guide, Part 00)"
  else row "HVE Squad plugin pair" "CLI client only" "MISSING" "See guide, Part 00, step 3"; fi
else
  row "GitHub Copilot CLI" "CLI client only" "NOT FOUND" "Skip if you use the App or VS Code. Install: brew install --cask copilot-cli"
fi

if command -v dotnet >/dev/null 2>&1 && dotnet --list-sdks 2>/dev/null | grep -q '^10\.'; then
  row ".NET 10 SDK" "Part 05" "OK" "$(dotnet --list-sdks | grep '^10\.' | tail -n 1)"
else
  row ".NET 10 SDK" "Part 05" "MISSING" "Install: brew install --cask dotnet-sdk"
fi

if command -v az >/dev/null 2>&1; then
  row "Azure CLI" "Part 04 (validation)" "OK" "azure-cli $(az version --query '"azure-cli"' -o tsv 2>/dev/null)"
  if az bicep version >/dev/null 2>&1; then row "Bicep" "Part 04 (validation)" "OK" "$(az bicep version 2>/dev/null | grep 'Bicep CLI version' | head -n 1)"
  else row "Bicep" "Part 04 (validation)" "MISSING" "Run: az bicep install"; fi
else
  row "Azure CLI" "Part 04 (validation)" "OPTIONAL" "Install: brew install azure-cli"
fi

if command -v apm >/dev/null 2>&1; then
  v="$(first apm --version)"
  if echo "$v" | grep -q '0\.29\.0'; then row "APM CLI" "VS Code client only" "OK" "$v"
  else row "APM CLI" "VS Code client only" "WRONG VERSION" "$v - the workshop needs exactly 0.29.0"; fi
else
  row "APM CLI" "VS Code client only" "NOT FOUND" "Skip if you use the Copilot App or CLI"
fi

echo
# Part 05 compares the tests with the tag "starter".
starter_commit() {
  identity=(-c commit.gpgsign=false)
  if [ -z "$(git config user.email 2>/dev/null)" ]; then identity+=(-c "user.name=Northwind Workshop" -c "user.email=workshop@northwind.example"); fi
  git -c core.safecrlf=false add -A 2>/dev/null
  git "${identity[@]}" commit -q -m "Northwind workshop starter" >/dev/null 2>&1
}
if [ $has_git -eq 1 ]; then
  [ -d .git ] || git init -b main >/dev/null
  if git rev-parse -q --verify refs/tags/starter >/dev/null 2>&1; then
    echo "Git: repository ready, tag \"starter\" present. Nothing changed."
  elif ! git rev-parse -q --verify HEAD >/dev/null 2>&1; then
    if starter_commit; then
      git tag starter
      echo "Git: repository created with a first commit of the starter files (tag \"starter\")."
    else
      echo "Git: the first commit failed. Fix the error shown by 'git commit -m Starter', then run this script again."
    fi
  else
    roots="$(git rev-list --max-parents=0 HEAD)"
    if [ "$(echo "$roots" | wc -l | tr -d ' ')" = "1" ]; then
      git tag starter "$roots"
      echo "Git: tag \"starter\" added to the first commit (${roots:0:7})."
    else
      echo "Git: no tag \"starter\" yet. Tag the commit that holds the original starter: git tag starter <commit>"
    fi
  fi
fi

printf '\nNext: open this folder in your Copilot client and follow Part 01 of the guide.\n'
[ $has_git -eq 1 ] || exit 1
exit 0
