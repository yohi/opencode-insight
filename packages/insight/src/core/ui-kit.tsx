import { Component, JSX, splitProps } from "solid-js";

export const Button: Component<JSX.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <button
      {...others}
      class={`px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors ${local.class || ""}`}
    >
      {local.children}
    </button>
  );
};

export const Input: Component<JSX.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <input
      {...others}
      class={`border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${local.class || ""}`}
    />
  );
};

export const Card: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <div {...others} class={`border rounded shadow p-4 bg-white ${local.class || ""}`}>
      {local.children}
    </div>
  );
};

export const Badge: Component<JSX.HTMLAttributes<HTMLSpanElement>> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <span {...others} class={`inline-block px-2 py-1 text-xs rounded bg-gray-200 ${local.class || ""}`}>
      {local.children}
    </span>
  );
};

// Layout Components
export const Stack: Component<JSX.HTMLAttributes<HTMLDivElement> & { spacing?: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children", "spacing"]);
  return (
    <div {...others} class={`flex flex-col ${local.spacing || "space-y-4"} ${local.class || ""}`}>
      {local.children}
    </div>
  );
};

export const Group: Component<JSX.HTMLAttributes<HTMLDivElement> & { spacing?: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children", "spacing"]);
  return (
    <div {...others} class={`flex items-center ${local.spacing || "space-x-4"} ${local.class || ""}`}>
      {local.children}
    </div>
  );
};
