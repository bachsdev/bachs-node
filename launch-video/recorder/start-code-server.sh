#!/usr/bin/env bash
# Starts code-server for one recording directory: start-code-server.sh <recdir>
# The project lives in <recdir>/snapkit-checkout; terminals use ./bashrc.
set -euo pipefail
REC=$(realpath "$1")
HERE=$(dirname "$(realpath "$0")")
CS=${CODE_SERVER:-$HOME/opt/code-server-$(npm view code-server version)-linux-amd64/bin/code-server}
mkdir -p "$REC/vscode/User" "$REC/snapkit-checkout"
cp "$HERE"/vscode-user/*.json "$REC/vscode/User/"
cp "$HERE/bashrc" "$REC/bashrc"
pkill -f 'code-server.*--bind-addr 127.0.0.1:8080' || true
LANG=C.UTF-8 RECORD_DIR=$REC nohup "$CS" --auth none --bind-addr 127.0.0.1:8080 --disable-telemetry --disable-update-check \
  --disable-workspace-trust --user-data-dir "$REC/vscode" --extensions-dir "$REC/vscode/extensions" \
  "$REC/snapkit-checkout" > "$REC/code-server.log" 2>&1 &
for i in $(seq 60); do curl -sf -o /dev/null http://127.0.0.1:8080/healthz && break; sleep 0.5; done
echo "code-server up for $REC"
