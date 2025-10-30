"use client";

import Link from "next/link";
import { Github } from "lucide-react";
import { ModeToggle } from "./mode-toggle";

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <Link
              href="https://darkalphacapital.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Dark Alpha Capital
            </Link>
            . The source code is available on{" "}
            <Link
              href="https://github.com/darkalphavc"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              GitHub
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center space-x-1">
          <ModeToggle />
        </div>
      </div>
    </footer>
  );
}
