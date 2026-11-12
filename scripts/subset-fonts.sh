#!/usr/bin/env sh
# Subsets the Geist variable fonts from the `geist` package to the characters the site uses
# (Basic Latin, Latin-1, general punctuation, arrows, minus). Re-run after adding copy with
# new non-Latin characters. Needs fonttools + brotli: `pip install fonttools brotli`.
set -e
cd "$(dirname "$0")/.."
SRC=node_modules/geist/dist/fonts
OUT=src/app/fonts
UNICODES="U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2010-2027,U+2030-203A,U+2044,U+20AC,U+2122,U+2190-2199,U+2212"
for pair in "geist-sans/Geist-Variable:Geist-Variable" "geist-mono/GeistMono-Variable:GeistMono-Variable"; do
  in="${pair%%:*}"; out="${pair##*:}"
  pyftsubset "$SRC/$in.woff2" --unicodes="$UNICODES" --layout-features='*' \
    --flavor=woff2 --output-file="$OUT/$out.subset.woff2"
done
ls -l "$OUT"
