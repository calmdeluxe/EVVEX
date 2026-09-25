import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-[rgba(244,228,188,0.1)] text-[#F5E6C8] border border-[rgba(244,228,188,0.25)] [a]:hover:bg-[rgba(244,228,188,0.2)]",
        secondary:
          "bg-[#0F1A2E] text-[#B8B8B8] border border-[rgba(244,228,188,0.15)] [a]:hover:bg-[#0F1A2E]/80",
        destructive:
          "bg-red-500/10 text-red-400 border border-red-500/20 focus-visible:ring-destructive/20 [a]:hover:bg-red-500/20",
        outline:
          "border-[rgba(244,228,188,0.3)] text-[#F5E6C8] [a]:hover:bg-white/5",
        ghost:
          "hover:bg-white/5 hover:text-white text-[#B8B8B8]",
        link: "text-[#F5E6C8] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
