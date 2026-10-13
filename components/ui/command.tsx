'use client'

import * as React from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { cn } from '@/lib/utils'

export function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn('flex h-full w-full flex-col overflow-hidden rounded-md bg-surface text-ink', className)}
      {...props}
    />
  )
}

export function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="flex h-11 items-center gap-2 border-b border-line px-3">
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'h-10 w-full rounded-md border-0 bg-transparent px-0 py-3 text-sm text-ink shadow-none outline-none placeholder:text-ink-muted hover:translate-y-0 hover:scale-100 hover:shadow-none focus:translate-y-0 focus:scale-100 focus:shadow-none',
          className,
        )}
        {...props}
      />
    </div>
  )
}

export function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto', className)}
      {...props}
    />
  )
}

export function CommandEmpty({ ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty data-slot="command-empty" className="py-6 text-center text-sm text-ink-muted" {...props} />
}

export function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn('overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-muted', className)}
      {...props}
    />
  )
}

export function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-2 text-sm text-ink outline-none data-[selected=true]:bg-surface-2 data-[selected=true]:text-ink data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
