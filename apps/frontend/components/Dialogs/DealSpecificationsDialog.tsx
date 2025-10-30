"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfinityIcon } from "lucide-react";
import DealSpecificationsForm from "../forms/deal-specifications-form";
import { DealStatus } from "@prisma/client";

export function DealSpecificationsDialog({
  dealUid,
  dealStatus,
  dealReviewed,
  dealPublished,
  dealSeen,
}: {
  dealUid: string;
  dealStatus: DealStatus;
  dealReviewed: boolean;
  dealSeen: boolean;
  dealPublished: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <InfinityIcon className="size-4" />
            Deal Specifications
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Deal Specifications</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you&apos;re
              done.
            </DialogDescription>
          </DialogHeader>
          <DealSpecificationsForm
            dealUid={dealUid}
            dealStatus={dealStatus}
            dealSeen={dealSeen}
            dealReviewed={dealReviewed}
            dealPublished={dealPublished}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">
          <InfinityIcon className="size-4" />
          Deal Specifications
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Deal Specifications</DrawerTitle>
          <DrawerDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </DrawerDescription>
        </DrawerHeader>
        <DealSpecificationsForm
          dealUid={dealUid}
          dealStatus={dealStatus}
          dealReviewed={dealReviewed}
          dealPublished={dealPublished}
          dealSeen={dealSeen}
        />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
