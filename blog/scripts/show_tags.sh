#!/bin/sh

ls "$1/"*.md | xargs grep "tags" | awk -F ":" '{print $3}' | sed -e 's/, /\n/g' | tr -d '" ' | sort | uniq
