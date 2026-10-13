import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 grid gap-4 border border-[#e5e3dc] bg-white text-[#111110] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)] duration-200 dark:border-white/12 dark:bg-[#0b0b0c] dark:text-[#f4f4f2] inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-[18px] border-b-0 px-5 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[14px] sm:border-b sm:p-6 sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0 motion-reduce:animate-none",
          className
        )}
        {...props}
      >
        <span aria-hidden="true" className="mx-auto h-1 w-9 rounded-full bg-[#cfcdc5] dark:bg-white/25 sm:hidden" />
        {children}
        {showCloseButton && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 sm:top-3.5 sm:right-3.5">
            <span aria-hidden="true" className="pointer-coarse:hidden rounded-[5px] border border-[#e5e3dc] px-1.5 py-[3px] font-mono text-[10px] tracking-[0.08em] text-[#5c5b56] select-none dark:border-white/12 dark:text-[#a3a29c]">ESC</span>
            <DialogPrimitive.Close
              data-slot="dialog-close"
              className="inline-flex size-7 items-center justify-center rounded-md text-[#5c5b56] hover:bg-[#f6f5f2] hover:text-[#111110] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f3f8f] dark:text-[#a3a29c] dark:hover:bg-[#151517] dark:hover:text-[#f4f4f2] dark:focus-visible:ring-[#8fb0ff] pointer-coarse:size-11"
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-left pr-20", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-xl leading-tight font-semibold tracking-[-0.015em] text-[#111110] dark:text-[#f4f4f2]", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm leading-relaxed text-[#5c5b56] dark:text-[#a3a29c]", className)}
      {...props}
    />
  )
}

function DialogEyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-eyebrow"
      className={cn(
        "font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#5c5b56] dark:text-[#a3a29c]",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
