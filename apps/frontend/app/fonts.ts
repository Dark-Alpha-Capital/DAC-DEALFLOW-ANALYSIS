import { Geist_Mono, Geist } from "next/font/google";

export const fontSans = Geist({
    subsets: ["latin"],
    variable: "--font-geist",
});

export const fontMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-geist-mono",
});