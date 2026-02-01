import { DM_Sans, Geist_Mono } from "next/font/google";

export const fontSans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-geist",
});

export const fontMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-geist-mono",
});