"use client";

import React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Box,
  Info,
  Mail,
  Home,
  Lock,
  Building,
  List,
  CheckSquare,
  Filter,
} from "lucide-react";

export default function MenuDialog() {
  const menuItems = [
    {
      category: "Navigation",
      items: [
        {
          navLink: "/",
          navTitle: "Home",
          icon: Home,
        },
        {
          navLink: "/new-deal",
          navTitle: "New Deal",
          icon: Info,
        },
        {
          navLink: "/raw-deals",
          navTitle: "Raw Deals",
          icon: List,
        },
        {
          navLink: "/published-deals",
          navTitle: "Published Deals",
          icon: CheckSquare,
        },
        {
          navLink: "/screeners",
          navTitle: "Screeners",
          icon: Filter,
        },
        {
          navLink: "/companies",
          navTitle: "Companies",
          icon: Building,
        },
      ],
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all hover:shadow-xl"
        >
          <Box className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Menu</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          {menuItems.map((category, index) => (
            <div key={index} className="mb-6">
              <h3 className="mb-2 text-lg font-semibold text-muted-foreground">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item, itemIndex) => (
                  <Link
                    key={itemIndex}
                    href={item.navLink}
                    className="flex items-center rounded-lg p-3 text-sm transition-colors hover:bg-muted"
                    target={undefined}
                    rel={undefined}
                  >
                    <item.icon className="mr-3 h-5 w-5 text-primary" />
                    <span>{item.navTitle}</span>
                  </Link>
                ))}
              </div>
              {index < menuItems.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
