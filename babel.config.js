const presets = ["babel-preset-atomic"]

const plugins = []

module.exports = {
  presets,
  plugins,
  exclude: ["node_modules/**", "lib/debugger/VendorLib/**"],
  sourceMap: "inline",
}
