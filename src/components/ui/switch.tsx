"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked,
      defaultChecked = false,
      disabled,
      onCheckedChange,
      onClick,
      ...props
    },
    ref
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked)
    const isControlled = checked !== undefined
    const isChecked = isControlled ? checked : uncontrolledChecked

    const toggle = () => {
      if (disabled) return

      const nextChecked = !isChecked

      if (!isControlled) {
        setUncontrolledChecked(nextChecked)
      }

      onCheckedChange?.(nextChecked)
    }

    return (
      <button
        {...props}
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        data-state={isChecked ? "checked" : "unchecked"}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) toggle()
        }}
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-slate-200 p-0.5 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-brand-sage-darker",
          className
        )}
      >
        <span
          data-state={isChecked ? "checked" : "unchecked"}
          className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5"
        />
      </button>
    )
  }
)

Switch.displayName = "Switch"

export { Switch }
