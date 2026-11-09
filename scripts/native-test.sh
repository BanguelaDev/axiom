#!/usr/bin/env bash
set -euo pipefail
mkdir -p work/native-evidence
trap 'timeout 10s adb logcat -d > work/native-evidence/logcat.txt || true' EXIT
adb shell getprop ro.build.version.release > work/native-evidence/android-version.txt
adb install work/candidate/AXIOM-android-local.apk
maestro --version
maestro test --debug-output work/native-evidence/debug .maestro/android-local.yaml
node scripts/check-native-media.mjs background
adb shell input keyevent KEYCODE_SLEEP
node scripts/check-native-media.mjs locked
