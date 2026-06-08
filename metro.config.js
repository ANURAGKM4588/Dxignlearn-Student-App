const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'cjs' to source extensions
config.resolver.sourceExts.push('cjs');

// Disable unstable_enablePackageExports to resolve Firebase resolution conflicts
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
