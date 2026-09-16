#!/usr/bin/env bash

set -euo pipefail

HUGO_VERSION="0.147.0"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
TOOLS_DIR="$SCRIPT_DIR/.tools"
HUGO_BIN="$TOOLS_DIR/hugo/$HUGO_VERSION/hugo"

install_hugo() {
    local architecture archive checksum expected_checksum install_dir temporary_dir url

    case "$(uname -s)-$(uname -m)" in
        Linux-x86_64)
            architecture="amd64"
            ;;
        Linux-aarch64 | Linux-arm64)
            architecture="arm64"
            ;;
        *)
            echo "Unsupported platform: $(uname -s)-$(uname -m)" >&2
            exit 1
            ;;
    esac

    for command_name in awk curl install mktemp sha256sum tar; do
        if ! command -v "$command_name" >/dev/null 2>&1; then
            echo "Installing Hugo requires '$command_name'." >&2
            exit 1
        fi
    done

    archive="hugo_extended_${HUGO_VERSION}_linux-${architecture}.tar.gz"
    url="https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}"
    install_dir="$(dirname -- "$HUGO_BIN")"
    temporary_dir="$(mktemp -d)"

    trap "rm -rf -- $(printf '%q' "$temporary_dir")" EXIT

    echo "Hugo ${HUGO_VERSION} is not installed locally; downloading it..."
    curl --fail --location --silent --show-error \
        --output "$temporary_dir/$archive" \
        "$url/$archive"
    curl --fail --location --silent --show-error \
        --output "$temporary_dir/checksums.txt" \
        "$url/hugo_${HUGO_VERSION}_checksums.txt"

    expected_checksum="$(awk -v archive="$archive" '$2 == archive { print $1 }' "$temporary_dir/checksums.txt")"
    if [[ -z "$expected_checksum" ]]; then
        echo "Could not find a checksum for $archive." >&2
        exit 1
    fi

    checksum="$(sha256sum "$temporary_dir/$archive" | awk '{ print $1 }')"
    if [[ "$checksum" != "$expected_checksum" ]]; then
        echo "Checksum verification failed for $archive." >&2
        exit 1
    fi

    mkdir -p -- "$install_dir"
    tar -xzf "$temporary_dir/$archive" -C "$temporary_dir" hugo
    install -m 0755 "$temporary_dir/hugo" "$HUGO_BIN"
    rm -rf -- "$temporary_dir"
    trap - EXIT
}

ensure_hugo() {
    if [[ ! -x "$HUGO_BIN" ]]; then
        install_hugo
    fi
}

if [ $# -lt 1 ]; then
    echo "Usage: $0 <command> [args...]"
    exit 1
fi

command="$1"
shift
cd -- "$SCRIPT_DIR"

case "$command" in
    "dev")
        ensure_hugo
        "$HUGO_BIN" serve -D "$@"
        ;;
    "pub")
        ensure_hugo
        rm -rf -- "$SCRIPT_DIR/public"
        "$HUGO_BIN" "$@"
        ;;
    *)
        echo "Unknown command: $command"
        exit 1
        ;;
esac
