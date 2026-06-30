#!/usr/bin/env python3
"""Generate Sea Island RV Resort imagery via the Gemini image API.

Zero dependencies — uses only the Python standard library, so it runs with the
system python3 (no Node/CLI needed). Calls the gemini-2.5-flash-image model
("Nano Banana") over REST and writes JPEGs into ../assets/.

Re-runnable: skips images that already exist, so you can rerun after a quota
reset to fill in the gaps.

Usage:
    export GEMINI_API_KEY=...        # or put it in one of the .env paths below
    python3 tools/gen-images.py      # all images
    python3 tools/gen-images.py hero clubhouse   # just these

Get a key at https://aistudio.google.com/apikey
"""
import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

STYLE = (
    "Lowcountry South Carolina coastal aesthetic, golden hour warm cinematic light, "
    "photorealistic editorial photography, live oaks with spanish moss and tall pines, "
    "wide 16:9 landscape, no text, no watermark, no logos"
)

# name -> subject prompt. Names match what js/app.js loads from assets/.
IMAGES = {
    "hero": "epic aerial drone photograph of a wooded RV resort on a cleared coastal tract, neat rows of RVs and travel trailers among live oaks and pines, a clubhouse and pool, a small pond, winding gravel roads",
    "clubhouse": "a coastal Lowcountry resort clubhouse building with a wraparound porch and standing-seam metal roof, rocking chairs, live oaks",
    "pool": "a resort saltwater swimming pool with sun deck, lounge chairs, shade cabanas and palmettos",
    "pond": "a stocked fishing pond with a small wooden pier and benches at an RV resort, pine trees, calm reflective water",
    "bathhouse": "a clean modern coastal bathhouse building with board-and-batten siding and a metal roof at an RV resort, landscaped walkway",
    "gatehouse": "a charming resort entrance gatehouse with a gate arm and a stacked-stone monument sign, grand live oaks draped in spanish moss",
    "store": "a cozy camp store and front-desk office building at an RV resort with a covered porch, rocking chairs and string lights",
    "pickleball": "two pickleball courts at a coastal resort surrounded by palmettos and live oaks, fresh blue and green surface",
    "dogpark": "a fenced grassy off-leash dog park at an RV resort with agility equipment and a big shade tree",
    "storage": "a tidy fenced RV and boat storage yard with a maintenance barn at a resort, neat gravel lot",
    "backin": "a back-in RV campsite with full hookups, a concrete pad, a picnic table and fire ring, a Class C motorhome parked, grassy site under live oaks",
    "pullthru": "a spacious pull-through RV site with a large Class A diesel motorhome and a towed car, wide level gravel pad",
    "premium": "an oversized premium RV patio site with a concrete patio, outdoor furniture and fire pit, a large motorhome, mature live oaks, extra space and privacy",
    "glamping": "a glamping cabin and a safari tent with a wooden deck and string lights beside the water at dusk, cozy and inviting",
}


def load_key():
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key.strip()
    for path in (
        os.path.join(ROOT, ".env"),
        os.path.expanduser("~/.gemini/.env"),
        os.path.expanduser("~/.env"),
    ):
        if os.path.isfile(path):
            with open(path) as fh:
                for line in fh:
                    if line.strip().startswith("GEMINI_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def generate(name, prompt, key):
    out = os.path.join(ASSETS, f"{name}.jpg")
    if os.path.exists(out):
        print(f"skip {name}")
        return True
    body = json.dumps({"contents": [{"parts": [{"text": f"{prompt}, {STYLE}"}]}]}).encode()
    data = None
    for attempt in range(4):
        req = urllib.request.Request(
            f"{ENDPOINT}?key={key}", data=body,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.load(resp)
            break
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                wait = 35
                print(f"     {name}: 429 rate-limited, waiting {wait}s (attempt {attempt + 1}/4)")
                time.sleep(wait)
                continue
            print(f"FAIL {name}: HTTP {e.code} {e.read().decode()[:160]}")
            return False
        except Exception as e:
            print(f"FAIL {name}: {e}")
            return False
    if data is None:
        return False
    for part in data.get("candidates", [{}])[0].get("content", {}).get("parts", []):
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            with open(out, "wb") as fh:
                fh.write(base64.b64decode(inline["data"]))
            print(f"OK   {name}")
            return True
    print(f"FAIL {name}: no image in response")
    return False


def main():
    key = load_key()
    if not key:
        sys.exit("No GEMINI_API_KEY (env or .env). Get one at https://aistudio.google.com/apikey")
    os.makedirs(ASSETS, exist_ok=True)
    wanted = sys.argv[1:] or list(IMAGES)
    # Hero first — if it fails, the quota/key is likely bad; bail early.
    if "hero" in wanted:
        if not generate("hero", IMAGES["hero"], key) and not os.path.exists(os.path.join(ASSETS, "hero.jpg")):
            sys.exit("hero failed — check the key/quota, then rerun.")
        wanted = [w for w in wanted if w != "hero"]
    for name in wanted:
        if name not in IMAGES:
            print(f"?? unknown image '{name}'")
            continue
        generate(name, IMAGES[name], key)
        time.sleep(2)
    print("DONE:", ", ".join(sorted(os.path.splitext(f)[0] for f in os.listdir(ASSETS) if f.endswith(".jpg"))) or "(none)")


if __name__ == "__main__":
    main()
