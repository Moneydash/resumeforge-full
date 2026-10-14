#!/usr/bin/env bash
# Control maintenance mode from the command line.
#
#   maintenance.sh status
#   maintenance.sh on  [--ends <ISO>] [--message <text>]
#   maintenance.sh off
#   maintenance.sh schedule <start ISO> [--ends <ISO>] [--message <text>]
#
# Environment:
#   MAINTENANCE_ADMIN_TOKEN  required for on/off/schedule (same value as on the server)
#   MAINTENANCE_URL          server base URL, default http://localhost:8080
set -euo pipefail

BASE_URL="${MAINTENANCE_URL:-http://localhost:8080}"
command="${1:-}"
[ -n "$command" ] && shift || true

json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

send() {
  if [ -z "${MAINTENANCE_ADMIN_TOKEN:-}" ]; then
    echo "Set MAINTENANCE_ADMIN_TOKEN first." >&2
    exit 1
  fi
  curl -sS --fail-with-body -X PUT "$BASE_URL/maintenance" \
    -H "Content-Type: application/json" \
    -H "x-admin-token: $MAINTENANCE_ADMIN_TOKEN" \
    -d "$1"
  echo
}

build_body() { # build_body <action> [startsAt] -- remaining args are flags
  local action="$1" starts="${2:-}"
  shift 2 || shift $#
  local ends="" message=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --ends) ends="$2"; shift 2 ;;
      --message) message="$2"; shift 2 ;;
      *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
  done
  local body="{\"action\":\"$action\""
  [ -n "$starts" ] && body="$body,\"startsAt\":\"$(json_escape "$starts")\""
  [ -n "$ends" ] && body="$body,\"endsAt\":\"$(json_escape "$ends")\""
  [ -n "$message" ] && body="$body,\"message\":\"$(json_escape "$message")\""
  printf '%s}' "$body"
}

case "$command" in
  status)
    curl -sS --fail-with-body "$BASE_URL/maintenance/status"
    echo
    ;;
  on)
    send "$(build_body on "" "$@")"
    ;;
  off)
    send '{"action":"off"}'
    ;;
  schedule)
    start="${1:-}"
    if [ -z "$start" ]; then echo "Usage: maintenance.sh schedule <start ISO> [--ends <ISO>] [--message <text>]" >&2; exit 1; fi
    shift
    send "$(build_body schedule "$start" "$@")"
    ;;
  *)
    echo "Usage: maintenance.sh status | on | off | schedule <start ISO>" >&2
    exit 1
    ;;
esac
