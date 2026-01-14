import * as React from "react";

import { cn } from "@/lib/utils";
import { badgeVariants } from "@/constants/ui";
import type { TBadgeProps } from "@/types/ui";

function Badge({ className, variant, ...props }: TBadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
