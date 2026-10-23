#!/usr/bin/env bash
# Records episode 01 chapter by chapter and checks every take for secrets:
#   record-all.sh <node|python> <recdir> [chapter ...]
# With no chapters it starts from a clean project and records all of them.
# Stops at the first take that fails to record or fails a secret check.
set -euo pipefail
LANG_CUT=$1
REC=$(realpath -m "$2")
shift 2
HERE=$(dirname "$(realpath "$0")")
CHAPTERS=("$@")
if [ ${#CHAPTERS[@]} -eq 0 ]; then
  CHAPTERS=(install product checkout pay webhooks recap cold-open)
  rm -rf "$REC/snapkit-checkout" "$REC/session.env"
fi
export BACHS_API_KEY=${BACHS_API_KEY:-${Bachs:-}}
"$HERE/start-code-server.sh" "$REC"
for c in "${CHAPTERS[@]}"; do
  echo "=== $c"
  node "$HERE/episode01.mjs" "$LANG_CUT" "$c" "$REC" | grep -vE '^ +[0-9.]+s  (line|mouse|click)$'
  python3 "$HERE/verify_masks.py" "$REC/takes/$c" | tail -1
  python3 "$HERE/verify_ocr.py" "$REC/takes/$c" "$REC/session.env" 4 | tail -1
done
echo "=== all takes recorded and verified"
