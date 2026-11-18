import { Bodoni_Moda, IBM_Plex_Mono, Manrope } from "next/font/google";

export const fonteSerif = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], variable: "--mc-serif", display: "swap", adjustFontFallback: false });
export const fonteMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--mc-mono", display: "swap" });
export const fonteSans = Manrope({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--mc-sans", display: "swap" });

export const NOME_CONDOMINIO = "Pontões de Santo Agostinho";
