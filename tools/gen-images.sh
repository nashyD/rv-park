#!/usr/bin/env bash
# Generate all Sea Island RV Resort imagery via the Gemini CLI (nanobanana extension).
# Needs the `gemini` CLI + nanobanana extension. Re-runnable: skips images that
# already exist, so you can rerun after a quota reset to fill in the gaps.
#
# No Node/gemini CLI? Use tools/gen-images.py instead — same Gemini image API,
# only python3 + a key required.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

if [ -z "${GEMINI_API_KEY:-}" ]; then
  for f in "$ROOT/.env" "$HOME/.gemini/.env" "$HOME/.env"; do
    [ -f "$f" ] && { KEY=$(grep -E '^GEMINI_API_KEY=' "$f" | head -1 | cut -d= -f2-); break; }
  done
  KEY=${KEY:-}; KEY=${KEY%\"}; KEY=${KEY#\"}; export GEMINI_API_KEY="$KEY"
fi
[ -z "${GEMINI_API_KEY:-}" ] && { echo "no GEMINI_API_KEY found (env or .env)"; exit 1; }

mkdir -p assets
OUT="nanobanana-output"
STYLE="Lowcountry South Carolina coastal aesthetic, golden hour warm cinematic light, photorealistic editorial photography, live oaks with spanish moss and tall pines, wide 16:9 landscape, no text, no watermark, no logos"

gen() {
  name="$1"; prompt="$2"
  if [ -f "assets/$name" ]; then echo "skip $name"; return 0; fi
  for attempt in 1 2; do
    rm -f "$OUT"/* 2>/dev/null
    gemini --yolo "/generate '$prompt, $STYLE' --styles=photorealistic" >/tmp/coosaw-gen.log 2>&1
    newest=$(ls -t "$OUT"/* 2>/dev/null | head -1)
    if [ -n "$newest" ] && [ -f "$newest" ]; then mv "$newest" "assets/$name"; echo "OK   $name"; return 0; fi
    sleep 25
  done
  echo "FAIL $name"
  return 1
}

# Hero first — if it fails twice, the quota is down; abort to avoid a long pointless run.
gen "hero.jpg" "epic aerial drone photograph of a wooded RV resort on a cleared coastal tract, neat rows of RVs and travel trailers among live oaks and pines, a clubhouse and pool, a small pond, winding gravel roads"
if [ ! -f "assets/hero.jpg" ]; then echo "QUOTA DOWN — hero failed; aborting. Rerun this script after the Gemini quota resets."; exit 2; fi

gen "clubhouse.jpg" "a coastal Lowcountry resort clubhouse building with a wraparound porch and standing-seam metal roof, rocking chairs, live oaks"
gen "pool.jpg"      "a resort saltwater swimming pool with sun deck, lounge chairs, shade cabanas and palmettos"
gen "pond.jpg"      "a stocked fishing pond with a small wooden pier and benches at an RV resort, pine trees, calm reflective water"
gen "bathhouse.jpg" "a clean modern coastal bathhouse building with board-and-batten siding and a metal roof at an RV resort, landscaped walkway"
gen "gatehouse.jpg" "a charming resort entrance gatehouse with a gate arm and a stacked-stone monument sign, grand live oaks draped in spanish moss"
gen "store.jpg"     "a cozy camp store and front-desk office building at an RV resort with a covered porch, rocking chairs and string lights"
gen "pickleball.jpg" "two pickleball courts at a coastal resort surrounded by palmettos and live oaks, fresh blue and green surface"
gen "dogpark.jpg"   "a fenced grassy off-leash dog park at an RV resort with agility equipment and a big shade tree"
gen "storage.jpg"   "a tidy fenced RV and boat storage yard with a maintenance barn at a resort, neat gravel lot"
gen "backin.jpg"    "a back-in RV campsite with full hookups, a concrete pad, a picnic table and fire ring, a Class C motorhome parked, grassy site under live oaks"
gen "pullthru.jpg"  "a spacious pull-through RV site with a large Class A diesel motorhome and a towed car, wide level gravel pad"
gen "premium.jpg"   "an oversized premium RV patio site with a concrete patio, outdoor furniture and fire pit, a large motorhome, mature live oaks, extra space and privacy"
gen "glamping.jpg"  "a glamping cabin and a safari tent with a wooden deck and string lights beside the water at dusk, cozy and inviting"

echo "DONE. Generated assets:"; ls -1 assets
