import { JSX, onMount } from "solid-js";
import Sidebar from "./sidebar";
import { connectWebSocket } from "~/core/store";

export default function Layout(props: { children: JSX.Element }) {
  onMount(() => {
    connectWebSocket();
  });

  return (
    <div class="flex h-screen bg-gray-50 text-gray-900 font-sans antialiased">
      <Sidebar />
      <main class="flex-1 overflow-auto bg-gray-100 p-8">
        <div class="max-w-7xl mx-auto">
          {props.children}
        </div>
      </main>
    </div>
  );
}
