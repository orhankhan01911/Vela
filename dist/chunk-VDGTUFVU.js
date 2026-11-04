import { registerVolume, registerVpvr, registerClassicIndicators } from './chunk-6656AIP6.js';

// src/plugin.ts
function registerBuiltinIndicators() {
  registerVolume();
  registerVpvr();
  registerClassicIndicators();
}

export { registerBuiltinIndicators };
