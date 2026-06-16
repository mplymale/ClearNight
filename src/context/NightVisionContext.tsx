import React, { createContext, useContext, useState } from 'react';

// Night-vision palette — deep maroon sky + amber accent
export const NV_SKY: [string, string, string] = ['#150400', '#220600', '#180300'];
export const NV_GLOW = 'rgba(180,60,0,0.35)';
export const NV_ACCENT = '#e07830';
export const NV_ACCENT_SOFT = 'rgba(224,120,48,0.22)';
export const NV_CHIP = 'rgba(224,120,48,0.75)';
export const NV_BORDER = 'rgba(200,90,30,0.28)';
export const NV_CARD = 'rgba(140,40,10,0.18)';

interface NightVisionCtx {
  nightVision: boolean;
  setNightVision: (v: boolean) => void;
}

const NightVisionContext = createContext<NightVisionCtx>({
  nightVision: false,
  setNightVision: () => {},
});

export function NightVisionProvider({ children }: { children: React.ReactNode }) {
  const [nightVision, setNightVision] = useState(false);
  return (
    <NightVisionContext.Provider value={{ nightVision, setNightVision }}>
      {children}
    </NightVisionContext.Provider>
  );
}

export const useNightVision = () => useContext(NightVisionContext);
