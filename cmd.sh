#!/bin/env bash

if [ $# -lt 1 ]; then
    echo "Usage: $0 <command> [args...]"
    exit 1
fi

command="$1"
shift

case "$command" in
    "dev")
        hugo serve -D $@
        ;;
    "pub")
	rm -r publish
	hugo $@
        ;;
    *)
        echo "Unknown command: $command"
        exit 1
        ;;
esac
