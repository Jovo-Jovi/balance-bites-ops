/** SVGO 4 ESM config. Do not applyTransforms — vtracer paths sit in a scaled group. */
export default {
  multipass: true,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          collapseGroups: false,
          moveGroupAttrsToElems: false,
          convertShapeToPath: false,
          mergePaths: false,
          convertPathData: {
            floatPrecision: 2,
            applyTransforms: false,
          },
          cleanupNumericValues: { floatPrecision: 2 },
        },
      },
    },
  ],
};
