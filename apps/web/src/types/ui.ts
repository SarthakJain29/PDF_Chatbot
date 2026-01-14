import type * as React from "react";
import type { VariantProps } from "class-variance-authority";

import type { badgeVariants, buttonVariants } from "@/constants/ui";

export type TButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export type TBadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

export type TInputProps = React.InputHTMLAttributes<HTMLInputElement>;
