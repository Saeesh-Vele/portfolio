"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";

/** Very subtle bloom so dense clusters and accent points lift slightly. Desktop only. */
export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.18} luminanceThreshold={0.6} luminanceSmoothing={0.3} radius={0.6} />
    </EffectComposer>
  );
}
