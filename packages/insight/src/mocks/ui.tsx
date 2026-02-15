import { Component, JSX } from "solid-js";

export const Button: Component<JSX.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
  return (
    <button
      {...props}
      class={`px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 ${props.class || ""}`}
    >
      {props.children}
    </button>
  );
};

export const Input: Component<JSX.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  return (
    <input
      {...props}
      class={`border rounded px-3 py-2 w-full ${props.class || ""}`}
    />
  );
};

export const Card: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
  return (
    <div {...props} class={`border rounded shadow p-4 bg-white ${props.class || ""}`}>
      {props.children}
    </div>
  );
};

export const Badge: Component<JSX.HTMLAttributes<HTMLSpanElement>> = (props) => {
  return (
    <span {...props} class={`inline-block px-2 py-1 text-xs rounded bg-gray-200 ${props.class || ""}`}>
      {props.children}
    </span>
  );
};

// Add more mocks as needed during development
