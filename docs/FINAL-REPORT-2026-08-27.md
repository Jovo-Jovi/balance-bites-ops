# Balance Bites Ops — Final Audit Report

**Date:** 2026-08-27  
**Repo:** `Jovo-Jovi/balance-bites-ops` @ `7d83624` (`main`)
**Audit baseline:** `8e2f5dd` · **Rounds:** initial audit → re-audit → merge review → hotfix verification
**Toolchain:** `tsc --noEmit` clean · ESLint **0 errors / 13 warnings** · production build succeeds · `npm audit` 6 moderate (devDep only)

---

## 🟢 Verdict: shipped and sound

Every finding from the original audit is closed, accepted, or deferred by decision. The two blockers found during remediation — both introduced *by* the remediation — are fixed and verified. Nothing outstanding requires action before use.

| Layer | Before | After | Why |
|---|---|---|---|
| Architecture | C+ | **B** | Per-key docs unchanged, but writes are serialized and version-checked |
| Security | B+ | **A−** | Rules were already strong; CSP, headers, and real CAS enforcement added |
| Performance | D | **B−** | 549 → 390 KB gz per route; asset weight accepted by decision |
| Responsive/UX | B+ | **B+** | Unchanged, was already good |
| Accessibility | B− | **B+** | Modal keyboard containment, contrast fixed |
| Code quality | B− | **A−** | 20 lint errors → 0, strict `tsc` clean, CI enforcing |
| Ops | D+ | **B+** | CI with emulator rules tests, working backup path |

**🟢 24 closed · ⚪ 3 accepted · 🟡 2 open, non-blocking**

---

## Severity key

🔴 blocker · 🟠 high · 🟡 medium · 🔵 low · ⚪ accepted by decision · 🟢 closed

---

## Original audit — all items

| ID | Finding | Status |
|---|---|---|
| 🟢 H1 | Full dataset in `localStorage` after sign-out | **closed** — `clearLocalCache()` on sign-out and on auth-null |
| 🟢 H2 | Three apps in one bundle | **closed** — 549.3 → 390.4 KB gz, holding at 15 scripts |
| ⚪ H3 | 18 MB preset SVG | **accepted** — full path quality kept in Studio and print |
| 🟢 H4 | Backup path dead in default config | **closed** — assets optional, data zip ships either way |
| 🟢 H5 | Concurrent-edit clobber, CAS never enforced | **closed** — caller token, verified two-tab |
| 🟢 M1 | No security headers | **closed** — enforcing `frame-ancestors 'none'` + `X-Frame-Options: DENY`, broad policy in Report-Only |
| 🟢 M2 | 20 ESLint errors incl. 2 rules-of-hooks | **closed** — 0 errors |
| 🟢 M3 | Dead `/api/firebase-config` + `bb-cloud-store.js` | **closed** — both deleted |
| 🟢 M4 | No CI | **closed** — typecheck, lint, build, plus emulator rules tests |
| 🟢 M5 | `commitPrepInvoice` bypassed the write guard | **closed** — `satisfies` enforces at build time |
| 🟢 M6 | Finance context rebuilt every render | **closed** — 91 keys / 91 deps, exact match |
| 🟢 M7 | Modal had no focus trap, Escape, or restore | **closed** |
| 🟢 L1 | 6 moderate npm advisories | **assessed** — all from `firebase-admin` devDep, not in the bundle |
| 🟢 L2 | Deprecated `preferredRegion` | **closed** |
| 🟢 L3 | `--bb-warn` contrast 3.86:1 | **closed** |
| 🟢 L4 | Redundant zip copy | **closed** |
| ⚪ L5 | `bb_invoices` 1 MiB ceiling at ~730 invoices | **deferred by decision** |
| 🟢 L6 | `error.tsx` leaked raw messages | **closed** |

## Re-audit findings

| ID | Finding | Status |
|---|---|---|
| 🟢 N1 | No ruleset accepted both old and new clients | **closed** — transitional deploy, then tighten |
| 🟢 N2 | `commitPrepInvoice` guard could never fire | **closed** — dead check and unused helper removed |
| 🟢 N3 | Rules tests not in CI | **closed** — Java 21 + firebase-tools 15, runs before build |
| ⚪ N4 | Re-trace script was destructive | **moot** — deleted with the H3 rollback |
| 🟢 N5 | `permission-denied` misreported as a CAS conflict | **closed** — `classifyPersistError` probes the doc |

## Bugs introduced during remediation, then fixed

Both were caught because the gates tested the actual threat rather than a passing build. Worth recording — this is the pattern to keep.

| ID | Finding | Status |
|---|---|---|
| 🟢 R-1 | `persist` discarded the caller token and re-read the server, making `prevWriteId == clientWriteId` true by construction — H5 was reopened while looking fixed | **closed** at `dcad8a6`. Rules, tests, and CI were all correct; only the two-tab manual test could catch it. |
| 🟢 R-2 | `CloudStore.set` captured the token at call time while `queuePersist` deferred execution, so multi-write actions conflicted with themselves and silently dropped ledger rows | **closed** at `e3dcf3f`. Affected `applyProductStock`, `applyTruthStock`, `saveItem`, `approveProduction`, `approveDraft`. |

Verified on `main`: `set()` now passes `""`, and `persist` resolves `prevWriteId || lastAppliedWriteId.get(key) || (await readStoredWriteId(key))` inside the queued job. The strong path via `getVersioned` is intact at `invoice-context.tsx:135` and `finance-context.tsx:1039`. `firestore.rules` byte-identical since the merge.

---

## 🟡 Open, not blocking

### 🟡 O1 — The inline-script CSP reports (your console noise)

`script-src 'self'` in the **Report-Only** policy. Nothing is blocked; this is the policy telling you what would break if promoted to enforcing. Three distinct sources:

**1. Two inline bootstrap scripts** (`sha256-OBTN3Riy…`, `sha256-bW8paHQk…`) — Next.js App Router's own hydration bootstrap. Not your code; there is no `<script>` or `dangerouslySetInnerHTML` anywhere in `src/app/`. Fixing properly needs a nonce, which means a `middleware.ts` generating one per request and forcing dynamic rendering on every route. That trades your four static prerenders for per-request SSR — a real cost for a policy that is already doing its job on `frame-ancestors`.

**2. `https://apis.google.com/js/api.js`** — the Google Identity iframe loader, pulled by `signInWithPopup` (`auth-provider.tsx:141-145`). Not in your source; the Firebase Auth SDK injects it. `apis.google.com` needs to be in `script-src` before enforcing, or Google sign-in breaks.

**3. `background.js:53 Uncaught TypeError`** — a browser extension, same as before. Ignore.

**Recommendation: leave it Report-Only and silence the noise instead.** The enforcing header already carries `frame-ancestors 'none'`, which is what actually closes clickjacking. Add `https://apis.google.com` to `script-src` in the Report-Only policy so the auth-iframe reports stop, and add a comment stating that inline-script reports are Next's bootstrap and are expected until a nonce middleware exists. That leaves you with a clean, meaningful violation log instead of a wall of text you learn to scroll past — which is the actual risk of noisy Report-Only policies.

### 🟡 O2 — Pack art has grown to 33 PNGs / 12.1 MB, none lazy

`hub/src/components/design/studio-rail.tsx:148`

`public/design-presets` is now **30 MB**: 18 MB SVG (accepted) plus **12.1 MB of PNG across 33 files**, up from 3.7 MB across 10 at the merge review. Fourteen files exceed 400 KB; the largest is `bb-toy-cup.png` at 568.7 KB, 721×661.

All 33 render at once when the Composite pack rail opens, into `h-20` (80 px) boxes, with no `loading="lazy"`. `art-panel.tsx:114` has the attribute; this grid does not. Opening that rail fetches roughly 12 MB for about 260 KB of visible pixels.

Two cheap fixes, neither urgent: add `loading="lazy"` (one line, and the grid is already grouped by section so most stay below the fold), and generate 160 px thumbnails, reusing the preview-vs-print split that already works elsewhere. The full-size PNG is only needed once a piece is dropped on the die.

---

## ⚪ Accepted by decision

- **H3 — 18 MB of preset SVG.** Rolling back the re-trace was right. The version reverted scored **47.30%** interior pixel difference against the original artwork and had flattened the drop shadow behind the BB logo entirely. Measured alternative if ever wanted: 1536 px / `color_precision=8` / `filter_speckle=8` → 4.84% difference at 1,166 KB. `color_precision` was the culprit, not raster size — a 2048 px trace at `cp=6` still scored 37.50%.
- **L5 — invoice document ceiling.** `bb_invoices` is one document; a realistic 6-line Arabic invoice is 1,435 bytes, so the hard 1 MiB limit lands near **730 invoices**. `formatWriteError` already carries the message. Shard by year when it approaches; do it after CAS, never before.
- **N4 — re-trace script.** Deleted with the rollback.

---

## What's genuinely well built

**The Firestore rules were the strongest part before this work and are stronger now.** No permissive rule anywhere. `staff/{uid}` is `get`-only and self-scoped with `list` and writes denied, so there is no self-escalation path. Key docs enforce a closed 34-key allowlist — I verified it matches `bb-keys.json` exactly, zero drift in either direction — plus field shape and `updatedBy == request.auth.uid`. `create` and `update` are now split with a real compare-and-swap on each.

**Server-side staff verification is real.** `require-staff.ts` validates the ID token against `identitytoolkit accounts:lookup` and confirms the staff doc; it never trusts a client-supplied uid. Every R2 route calls it first.

**R2 credentials never reach the client.** `r2.ts` is `import "server-only"`, config comes from unprefixed env vars, and the browser only sees 900-second presigned URLs.

**The DiceBear proxy is correctly constrained** — hardcoded host, four allowlisted styles, seed stripped to `[\w\s-]`, size clamped. Thumbnails go browser-direct; only the final pick goes through the staff-gated proxy, so it is not an SSRF pivot.

**Escaping in the print path holds.** `open-print.ts` writes into a same-origin iframe, which would be a clean XSS chain. `esc()` is applied at every interpolation, attributes are double-quoted with `"` escaped, and `usableImage()` allowlists prefixes that exclude `javascript:`.

**`queuePersist` was your own addition and it is correct.** Serializing writes per key closes an interleaving race the audit never named, and it is what makes the chained CAS token valid.

**The Finance saving overlay** — toasting success only after Firestore accepts, rather than optimistically, is the right call for a ledger and is what surfaced R-2 instead of hiding it.

**The responsive and reduced-preference CSS.** Safe-area insets at three breakpoints, 44 px targets, 16 px inputs, `@supports` fallback for `backdrop-filter`, and `prefers-reduced-transparency` — which most teams have never heard of. 8 of 9 palette pairs cleared AA before anyone asked.

**CI now tests the threat, not the build.** The emulator rules tests assert that a stale `prevWriteId` is **denied** — the actual vulnerability — rather than that the code compiles.

---

## Two things worth carrying forward

**Both bugs introduced during remediation were in the same function, and neither was caught by a build, a typecheck, a lint pass, or the rules tests.** R-1 was found by reading the code against its own commit message; R-2 by a user noticing a toast that said "failed" next to numbers that looked right. Gates that assert compilation cannot catch a CAS that passes by construction. When the subtle mistake *is* the vulnerability, the gate has to be a manual test that reproduces the threat — the two-tab test and the multi-ingredient stock edit.

**Deploy ordering nearly bit twice.** The rules file being correct is not the same as the rules being published, and the client and rules must move in a specific sequence with a transitional ruleset between them. Worth writing into `docs/JOURNAL.md` as a standing procedure before the next schema change.
