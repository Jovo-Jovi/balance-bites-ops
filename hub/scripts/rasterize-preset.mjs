import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const [, , svgPath, pngPath, size = "1024"] = process.argv;
const max = Number(size) || 1024;
const svg = readFileSync(svgPath);
const probe = new Resvg(svg, { fitTo: { mode: "original" } });
const ow = Math.max(1, probe.width);
const oh = Math.max(1, probe.height);
const fit = ow >= oh ? { mode: "width", value: max } : { mode: "height", value: max };
const resvg = new Resvg(svg, {
  fitTo: fit,
  background: "rgba(0,0,0,0)",
});
const img = resvg.render();
writeFileSync(pngPath, img.asPng());
process.stdout.write(`${img.width}x${img.height}`);
