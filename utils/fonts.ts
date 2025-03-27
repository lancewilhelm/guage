import { Geist, EB_Garamond, Poppins } from "next/font/google";

export const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond-serif",
  subsets: ["latin"],
});

export const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const poppins = Poppins({
  weight: ["400", "500"],
  variable: "--font-poppins-sans",
  subsets: ["latin"],
});
