
import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

type ResponsiveFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function ResponsiveFormModal({
  open,
  onOpenChange,
  title,
  trigger,
  children,
  footer,
}: ResponsiveFormModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">{children}</div>
          {footer && <div className="mt-4 flex justify-end gap-2">{footer}</div>}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="max-h-[calc(90vh-7rem)] overflow-y-auto px-4 pb-4">
          {children}
        </div>
        {footer && (
          <DrawerFooter className="pt-0">
            <div className="flex justify-end gap-2">{footer}</div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
