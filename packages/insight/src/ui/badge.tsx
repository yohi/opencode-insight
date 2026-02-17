import { Component, JSX, splitProps, mergeProps } from "solid-js";

type BadgeVariant = "default" | "success" | "warning" | "error";

interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  error: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

export const Badge: Component<BadgeProps> = (props) => {
  const merged = mergeProps({ variant: "default" as BadgeVariant }, props);
  const [local, others] = splitProps(merged, ["class", "children", "variant"]);

  return (
    <span
      {...others}
      class={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent
        ${variantStyles[local.variant]}
        ${local.class || ""}
      `}
    >
      {local.children}
    </span>
  );
};
