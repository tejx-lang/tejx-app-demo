#!/usr/bin/env bash
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BUILD_DIR="$SCRIPT_DIR/build"
SRC_DIR="$SCRIPT_DIR/src"
LOCAL_TEJX_ROOT="$SCRIPT_DIR/../../tejx-lang"
LOCAL_TEJXC="$LOCAL_TEJX_ROOT/target/release/tejxc"
LOCAL_TEJX_STDLIB="$LOCAL_TEJX_ROOT/src/library"
LOCAL_TEJX_RUNTIME="$LOCAL_TEJX_ROOT/target/release/tejx_rt.a"
TEJXC_BIN="${TEJXC:-$LOCAL_TEJXC}"

if [[ ! -x "$TEJXC_BIN" ]]; then
    if command -v tejxc >/dev/null 2>&1; then
        TEJXC_BIN="tejxc"
    elif [[ -x "$HOME/.tejx/bin/tejxc" ]]; then
        TEJXC_BIN="$HOME/.tejx/bin/tejxc"
    fi
fi

mkdir -p "$BUILD_DIR"

echo "==> Building TejX Backend: $SRC_DIR/main.tx -> $BUILD_DIR/server"
"$TEJXC_BIN" \
    --stdlib-path "$LOCAL_TEJX_STDLIB" \
    --runtime-path "$LOCAL_TEJX_RUNTIME" \
    -o "$BUILD_DIR/server" \
    "$SRC_DIR/main.tx"

echo "==> Backend build successful: $BUILD_DIR/server"
