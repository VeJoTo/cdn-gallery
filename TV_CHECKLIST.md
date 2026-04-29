# TV & Sofa — Post-refactor verification checklist

Run these in order in a dev build (`npm run dev`). Each item is one action + one expected result.

---

## 1. Entry
- [ ] Click sofa → camera animates to TV hotspot (not overview)
- [ ] Click TV mesh directly → camera animates to TV hotspot
- [ ] `atTV` is true after arrival (check console: `window.__isAtTV()`)

## 2. TV mode state
- [ ] Crosshair is hidden when in TV mode
- [ ] `×` back button appears bottom-right
- [ ] Info panel (hologram) is visible after first visit, OR hint pulses on first visit
- [ ] YouTube iframe is playing / interactive

## 3. Holographic buttons
- [ ] `▶` (toggleTV) pauses/plays video
- [ ] `|◀` / `▶|` change video
- [ ] `ⓘ` opens info panel
- [ ] `PL` opens playlist panel
- [ ] `🔊` mutes/unmutes
- [ ] Hovering buttons shows glow; moving away removes it

## 4. Step-back (exit TV)
- [ ] Click `×` → camera moves back to `{-4.5, 1.6, 0}`
- [ ] Info panel and playlist panel remain visible
- [ ] Crosshair reappears
- [ ] Clicking the info/playlist panel re-zooms to TV
- [ ] Clicking unrelated area does NOT re-zoom to TV

## 5. Overlay + TV zoom bug (regression)
- [ ] From TV step-back, navigate to globe screen, open overlay, close it → camera does NOT zoom to TV
- [ ] Close any overlay (Fin du Monde, Globe Videos, Report) → camera does NOT zoom to TV

## 6. Room switch
- [ ] Enter nature room → YouTube pauses, panels hide
- [ ] Return to AI room → YouTube resumes, panels visible again

---

## Key wiring to grep for after a refactor

If something breaks, check these connection points first:

```bash
# updateHUD must call enterTVMode / exitTVMode
grep -n "enterTVMode\|exitTVMode" src/main.js

# Overlay guard must exist in the TV zoom mousedown handler
grep -n 'id\$="-overlay"' src/main.js

# Panel bounding-rect check must be inside !controls.isLocked
grep -n "controls.isLocked" src/main.js

# Sofa must point to tv hotspot
grep -n "hotspot.*tv\|tv.*hotspot" src/scene/sofa.js

# controls.lock() must be called after tvBackBtn click
grep -n "controls.lock" src/main.js

# atTV flag must be set in enterTVMode, cleared in exitTVMode
grep -n "atTV" src/main.js | head -20
```
