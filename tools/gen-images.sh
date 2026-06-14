#!/usr/bin/env bash
# Generate all Coosaw Landing imagery via the Gemini API (nanobanana extension).
# Reads GEMINI_API_KEY from ~/Documents/frontier/.env. Re-runnable: skips images
# that already exist, so you can rerun after a quota reset to fill in the gaps.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

KEY=$(grep -E '^GEMINI_API_KEY=' "$HOME/Documents/frontier/.env" | head -1 | cut -d= -f2-)
KEY=${KEY%\"}; KEY=${KEY#\"}
export GEMINI_API_KEY="$KEY"
[ -z "$GEMINI_API_KEY" ] && { echo "no GEMINI_API_KEY found"; exit 1; }

mkdir -p assets
OUT="nanobanana-output"
STYLE="Lowcountry South Carolina coastal aesthetic, golden hour warm cinematic light, photorealistic editorial photography, live oaks with spanish moss and palmettos, tidal marsh and saltwater estuary, wide 16:9 landscape, no text, no watermark, no logos"

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
gen "hero.jpg" "epic aerial drone photograph of a luxury waterfront RV resort on a marsh peninsula, neat curved rows of RVs and travel trailers, a wooden marina dock reaching into a tidal river, a clubhouse and pool, winding gravel roads"
if [ ! -f "assets/hero.jpg" ]; then echo "QUOTA DOWN — hero failed; aborting. Rerun this script after the Gemini quota resets."; exit 2; fi

gen "clubhouse.jpg" "a coastal Lowcountry resort clubhouse building with a wraparound screened porch and standing-seam metal roof overlooking tidal marsh, rocking chairs"
gen "pool.jpg"      "a resort saltwater swimming pool with sun deck, lounge chairs, shade cabanas and palmettos, tidal marsh in the background"
gen "dock.jpg"      "a wooden floating boat dock and kayak launch on a calm tidal river, a small jon boat tied up, marsh grass and reflections"
gen "bathhouse.jpg" "a clean modern coastal bathhouse building with board-and-batten siding and a metal roof at an RV resort, landscaped walkway"
gen "gatehouse.jpg" "a charming resort entrance gatehouse with a gate arm and a stacked-stone monument sign, grand live oaks draped in spanish moss"
gen "store.jpg"     "a cozy camp store and front-desk office building at an RV resort with a covered porch, rocking chairs and string lights"
gen "pickleball.jpg" "two pickleball courts at a coastal resort surrounded by palmettos and live oaks, fresh blue and green surface"
gen "dogpark.jpg"   "a fenced grassy off-leash dog park at an RV resort with agility equipment and a big shade tree"
gen "storage.jpg"   "a tidy fenced RV and boat storage yard with a maintenance barn at a resort, neat gravel lot"
gen "backin.jpg"    "a back-in RV campsite with full hookups, a concrete pad, a picnic table and fire ring, a Class C motorhome parked, grassy site under live oaks"
gen "pullthru.jpg"  "a spacious pull-through RV site with a large Class A diesel motorhome and a towed car, wide level gravel pad"
gen "waterfront.jpg" "a premium waterfront RV campsite backing directly onto a tidal marsh and river, a large motorhome with a deck and chairs facing the water"
gen "glamping.jpg"  "a glamping cabin and a safari tent with a wooden deck and string lights beside the water at dusk, cozy and inviting"

echo "DONE. Generated assets:"; ls -1 assets
