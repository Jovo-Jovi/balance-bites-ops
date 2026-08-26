"""Re-trace hub/public/design-presets/*.svg (vtracer spline) and emit 512px WebP previews.

Run from repo: python hub/scripts/retrace-design-presets.py
Requires: pip install vtracer pillow
          npm install @resvg/resvg-js svgo  in %TEMP%/bb-trace (or $TMPDIR/bb-trace)

Pass --skip-copy to write staging SVGs + preview WebPs without replacing public/*.svg.

Rasterize the square viewBox (not the tall/wide canvas) so the trace fills
0–100 the same way Studio slices character art.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image

REPO = Path(__file__).resolve().parents[2]
PRESET_DIR = REPO / "hub" / "public" / "design-presets"
PREVIEW_DIR = PRESET_DIR / "preview"
NODE_DIR = Path(os.environ.get("TEMP") or os.environ.get("TMPDIR") or "/tmp") / "bb-trace"
RASTER = Path(__file__).with_name("rasterize-preset.mjs")
SVGO = NODE_DIR / "node_modules" / "svgo" / "bin" / "svgo.js"
SVGO_CONFIG = Path(__file__).with_name("svgo.preset.mjs")
COMPARE_STEMS = ("bb-jelly-fruit", "bb-chicopon", "bb-popcorn-red")

TRACE = dict(
    colormode="color",
    hierarchical="stacked",
    mode="spline",
    filter_speckle=12,
    color_precision=6,
    layer_difference=24,
    corner_threshold=60,
    length_threshold=4.0,
    max_iterations=10,
    splice_threshold=45,
    path_precision=2,
)

_TOKEN = re.compile(r"[MmZzLlHhVvCcSsQqTtAa]|[+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?")
_ARITY = {
    "M": 2,
    "m": 2,
    "L": 2,
    "l": 2,
    "T": 2,
    "t": 2,
    "H": 1,
    "h": 1,
    "V": 1,
    "v": 1,
    "C": 6,
    "c": 6,
    "S": 4,
    "s": 4,
    "Q": 4,
    "q": 4,
    "A": 7,
    "a": 7,
    "Z": 0,
    "z": 0,
}
_IMPLICIT = {"M": "L", "m": "l"}


def svg_meta(path: Path) -> tuple[str, str, str]:
    text = path.read_text(encoding="utf-8", errors="ignore")[:4000]
    width = re.search(r'\bwidth="(\d+(?:\.\d+)?)"', text)
    height = re.search(r'\bheight="(\d+(?:\.\d+)?)"', text)
    title = re.search(r"<title>([^<]*)</title>", text)
    return (
        width.group(1) if width else "1000",
        height.group(1) if height else "1000",
        (title.group(1) if title else path.stem).strip(),
    )


def square_source(src: Path, dest: Path, size: int = 1024) -> None:
    """Force a square viewport matching viewBox so resvg does not letterbox."""
    text = src.read_text(encoding="utf-8")
    text = re.sub(r"\bwidth=\"[^\"]+\"", f'width="{size}"', text, count=1)
    text = re.sub(r"\bheight=\"[^\"]+\"", f'height="{size}"', text, count=1)
    dest.write_text(text, encoding="utf-8")


def rasterize(svg: Path, png: Path, size: int) -> None:
    if not (NODE_DIR / "node_modules" / "@resvg" / "resvg-js").exists():
        raise SystemExit(f"install @resvg/resvg-js in {NODE_DIR}")
    runner = NODE_DIR / "rasterize.mjs"
    runner.write_text(RASTER.read_text(encoding="utf-8"), encoding="utf-8")
    subprocess.check_call(
        ["node", str(runner), str(svg), str(png), str(size)],
        cwd=str(NODE_DIR),
    )


def _fmt(n: float) -> str:
    if abs(n) < 0.005:
        return "0"
    s = f"{n:.2f}".rstrip("0").rstrip(".")
    return "0" if s in {"-0", "-0.0"} else s


def parse_translate(transform: str | None) -> tuple[float, float]:
    if not transform:
        return 0.0, 0.0
    m = re.search(
        r"translate\(\s*([+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?)\s*(?:[, ]\s*([+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?))?\s*\)",
        transform,
    )
    if not m:
        return 0.0, 0.0
    tx = float(m.group(1))
    ty = float(m.group(2)) if m.group(2) is not None else 0.0
    return tx, ty


def transform_d(d: str, sx: float, sy: float, tx: float, ty: float) -> str:
    """Bake translate(tx,ty) then scale(sx,sy) into absolute path data."""
    tokens = _TOKEN.findall(d)
    out: list[str] = []
    i = 0
    cmd = ""
    first_pair = False

    def take(n: int) -> list[float]:
        nonlocal i
        vals = [float(tokens[i + k]) for k in range(n)]
        i += n
        return vals

    def ax(x: float) -> str:
        return _fmt((x + tx) * sx)

    def ay(y: float) -> str:
        return _fmt((y + ty) * sy)

    def rx(x: float) -> str:
        return _fmt(x * sx)

    def ry(y: float) -> str:
        return _fmt(y * sy)

    while i < len(tokens):
        t = tokens[i]
        if t.isalpha():
            cmd = t
            first_pair = cmd in "Mm"
            i += 1
            if cmd in "Zz":
                out.append("Z" if cmd == "Z" else "z")
            continue
        if not cmd:
            i += 1
            continue
        use = cmd
        if cmd in "Mm" and not first_pair:
            use = _IMPLICIT[cmd]
        arity = _ARITY[use]
        nums = take(arity)
        if use == "M":
            out.append(f"M{ax(nums[0])} {ay(nums[1])}")
            first_pair = False
        elif use == "m":
            out.append(f"m{rx(nums[0])} {ry(nums[1])}")
            first_pair = False
        elif use == "L":
            out.append(f"L{ax(nums[0])} {ay(nums[1])}")
        elif use == "l":
            out.append(f"l{rx(nums[0])} {ry(nums[1])}")
        elif use == "T":
            out.append(f"T{ax(nums[0])} {ay(nums[1])}")
        elif use == "t":
            out.append(f"t{rx(nums[0])} {ry(nums[1])}")
        elif use == "H":
            out.append(f"H{ax(nums[0])}")
        elif use == "h":
            out.append(f"h{rx(nums[0])}")
        elif use == "V":
            out.append(f"V{ay(nums[0])}")
        elif use == "v":
            out.append(f"v{ry(nums[0])}")
        elif use == "C":
            out.append(
                f"C{ax(nums[0])} {ay(nums[1])} {ax(nums[2])} {ay(nums[3])} {ax(nums[4])} {ay(nums[5])}"
            )
        elif use == "c":
            out.append(
                f"c{rx(nums[0])} {ry(nums[1])} {rx(nums[2])} {ry(nums[3])} {rx(nums[4])} {ry(nums[5])}"
            )
        elif use == "S":
            out.append(f"S{ax(nums[0])} {ay(nums[1])} {ax(nums[2])} {ay(nums[3])}")
        elif use == "s":
            out.append(f"s{rx(nums[0])} {ry(nums[1])} {rx(nums[2])} {ry(nums[3])}")
        elif use == "Q":
            out.append(f"Q{ax(nums[0])} {ay(nums[1])} {ax(nums[2])} {ay(nums[3])}")
        elif use == "q":
            out.append(f"q{rx(nums[0])} {ry(nums[1])} {rx(nums[2])} {ry(nums[3])}")
        elif use == "A":
            out.append(
                f"A{_fmt(nums[0] * sx)} {_fmt(nums[1] * sy)} {_fmt(nums[2])} "
                f"{int(nums[3])} {int(nums[4])} {ax(nums[5])} {ay(nums[6])}"
            )
        elif use == "a":
            out.append(
                f"a{_fmt(nums[0] * sx)} {_fmt(nums[1] * sy)} {_fmt(nums[2])} "
                f"{int(nums[3])} {int(nums[4])} {rx(nums[5])} {ry(nums[6])}"
            )
    return "".join(out)


def parse_rgb(fill: str) -> tuple[int, int, int] | None:
    s = fill.strip()
    if s.startswith("#"):
        h = s[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        if len(h) == 6:
            return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    m = re.match(r"rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)", s, re.I)
    if m:
        return int(m.group(1)), int(m.group(2)), int(m.group(3))
    return None


def is_neon_magenta(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return r >= 180 and b >= 180 and g <= 110


def snap_fill(fill: str, palette: list[tuple[int, int, int]]) -> str:
    rgb = parse_rgb(fill)
    if not rgb or not is_neon_magenta(rgb) or not palette:
        return fill
    best = min(palette, key=lambda p: (p[0] - rgb[0]) ** 2 + (p[1] - rgb[1]) ** 2 + (p[2] - rgb[2]) ** 2)
    return f"#{best[0]:02X}{best[1]:02X}{best[2]:02X}"


def wrap_traced(traced: Path, width: str, height: str, title: str, size_px: str) -> str:
    ET.register_namespace("", "http://www.w3.org/2000/svg")
    root = ET.parse(traced).getroot()
    vw = float(root.get("width") or "100")
    vh = float(root.get("height") or "100")
    ns = "{http://www.w3.org/2000/svg}"
    sx = 100.0 / vw
    sy = 100.0 / vh
    raw_paths: list[tuple[str, str, str]] = []
    palette: list[tuple[int, int, int]] = []
    for el in root.iter(f"{ns}path"):
        fill = el.get("fill") or "#000"
        rgb = parse_rgb(fill)
        if rgb and not is_neon_magenta(rgb):
            palette.append(rgb)
        extra = ""
        if el.get("fill-opacity"):
            extra += f' fill-opacity="{el.get("fill-opacity")}"'
        if el.get("opacity"):
            extra += f' opacity="{el.get("opacity")}"'
        tx, ty = parse_translate(el.get("transform"))
        d = transform_d(el.get("d") or "", sx, sy, tx, ty)
        raw_paths.append((d, fill, extra))
    parts = [
        f'<path d="{d}" fill="{snap_fill(fill, palette)}"{extra}/>' for d, fill, extra in raw_paths
    ]
    inner = "\n    ".join(parts)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" '
        f'width="{width}" height="{height}" shape-rendering="geometricPrecision" '
        f'data-vector="vtracer" data-trace-mode="spline" data-trace-size="{size_px}">\n'
        f"  <title>{title}</title>\n"
        f'  <g id="art">\n'
        f"    {inner}\n"
        f"  </g>\n"
        f"</svg>\n"
    )


def svgo_optimize(src: Path, dest: Path) -> None:
    if not SVGO.is_file():
        raise SystemExit(f"install svgo in {NODE_DIR}")
    cmd = ["node", str(SVGO), str(src), "-o", str(dest)]
    if SVGO_CONFIG.is_file():
        cmd.extend(["--config", str(SVGO_CONFIG)])
    subprocess.check_call(cmd, cwd=str(NODE_DIR))


def composite_compare(orig_svg: Path, new_svg: Path, out_png: Path) -> float:
    a_png = NODE_DIR / f"cmp-a-{orig_svg.stem}.png"
    b_png = NODE_DIR / f"cmp-b-{orig_svg.stem}.png"
    rasterize(orig_svg, a_png, 400)
    rasterize(new_svg, b_png, 400)
    a = Image.open(a_png).convert("RGBA")
    b = Image.open(b_png).convert("RGBA")
    h = max(a.height, b.height)
    w = max(a.width, b.width)
    canvas_a = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    canvas_b = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    canvas_a.paste(a, ((w - a.width) // 2, (h - a.height) // 2), a)
    canvas_b.paste(b, ((w - b.width) // 2, (h - b.height) // 2), b)
    side = Image.new("RGBA", (w * 2 + 8, h), (240, 240, 240, 255))
    side.paste(canvas_a, (0, 0))
    side.paste(canvas_b, (w + 8, 0))
    side.save(out_png)
    rgb_a = canvas_a.convert("RGB")
    rgb_b = canvas_b.convert("RGB")
    if hasattr(rgb_a, "get_flattened_data"):
        px_a = list(rgb_a.get_flattened_data())
        px_b = list(rgb_b.get_flattened_data())
    else:
        px_a = list(rgb_a.getdata())
        px_b = list(rgb_b.getdata())
    mae = sum(abs(p[0] - q[0]) + abs(p[1] - q[1]) + abs(p[2] - q[2]) for p, q in zip(px_a, px_b)) / (
        3.0 * len(px_a)
    )
    return mae


def emit_webp(src_png: Path, dest: Path) -> None:
    im = Image.open(src_png).convert("RGBA")
    im.thumbnail((512, 512), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=82, method=6)


def main() -> None:
    import vtracer

    skip_copy = "--skip-copy" in sys.argv
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    staging = NODE_DIR / "out"
    staging.mkdir(exist_ok=True)
    files = sorted(PRESET_DIR.glob("*.svg"))
    if not files:
        raise SystemExit(f"no svgs in {PRESET_DIR}")

    for svg in files:
        print(f"== {svg.name}", flush=True)
        width, height, title = svg_meta(svg)
        square = NODE_DIR / f"{svg.stem}.square.svg"
        png = NODE_DIR / f"{svg.stem}.png"
        raw_svg = NODE_DIR / f"{svg.stem}.raw.svg"
        wrapped = staging / svg.name
        square_source(svg, square, 1024)
        rasterize(square, png, 1024)
        vtracer.convert_image_to_svg_py(str(png), str(raw_svg), **TRACE)
        img = Image.open(png)
        size_px = f"{img.width}x{img.height}"
        wrapped.write_text(
            wrap_traced(raw_svg, width, height, title, size_px),
            encoding="utf-8",
        )
        optimized = staging / f"{svg.stem}.opt.svg"
        svgo_optimize(wrapped, optimized)
        webp = PREVIEW_DIR / f"{svg.stem}.webp"
        emit_webp(png, webp)
        paths = optimized.read_text(encoding="utf-8").count("<path")
        print(
            f"   svg {optimized.stat().st_size / 1024:.1f} KB  paths {paths}  "
            f"webp {webp.stat().st_size / 1024:.1f} KB",
            flush=True,
        )
        if paths > 3000:
            print(f"   WARNING path count {paths} exceeds 3000", flush=True)
        optimized.replace(wrapped)

    print("\nVisual compare (left original, right retrace) …", flush=True)
    for stem in COMPARE_STEMS:
        orig = PRESET_DIR / f"{stem}.svg"
        new = staging / f"{stem}.svg"
        if not orig.is_file() or not new.is_file():
            continue
        out = NODE_DIR / f"compare-{stem}.png"
        mae = composite_compare(orig, new, out)
        print(f"   {stem} MAE {mae:.2f}  {out}", flush=True)

    svg_bytes = sum((staging / f.name).stat().st_size for f in files)
    webp_bytes = sum(p.stat().st_size for p in PREVIEW_DIR.glob("*.webp"))
    print(
        f"\nStaging SVGs {svg_bytes / (1024 * 1024):.2f} MB  "
        f"preview WebP {webp_bytes / (1024 * 1024):.2f} MB  "
        f"together {(svg_bytes + webp_bytes) / (1024 * 1024):.2f} MB",
        flush=True,
    )

    if skip_copy:
        print("Skipping public SVG replace (--skip-copy).", flush=True)
        return

    print("\nCopying SVGs into public/design-presets …", flush=True)
    for svg in staging.glob("*.svg"):
        if svg.name.endswith(".opt.svg"):
            continue
        target = PRESET_DIR / svg.name
        target.write_bytes(svg.read_bytes())
        print("  wrote", target.name)


if __name__ == "__main__":
    main()
