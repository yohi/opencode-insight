import { Component, JSX, splitProps } from "solid-js";

export const Card: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <div
      {...others}
      class={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6 transition-all ${local.class || ""}`}
    >
      {local.children}
    </div>
  );
};
