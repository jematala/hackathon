const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web") {
    const nativeModules = [
      "@clerk/expo/native",
      // Block the internal paths that carry the native-only import
      /\/@clerk\/expo\/dist\/native\//,
      /\/@clerk\/expo\/dist\/specs\//,
      /codegenNativeComponent/,
    ];

    for (const pattern of nativeModules) {
      const matches =
        typeof pattern === "string" ? moduleName === pattern : pattern.test(moduleName);

      if (matches) {
        return { type: "empty" };
      }
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
