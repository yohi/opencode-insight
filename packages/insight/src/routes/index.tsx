import { A } from "solid-start";
import { Card, Button } from "~/core/ui-kit";

export default function Home() {
  return (
    <div class="space-y-4">
      <h1 class="text-3xl font-bold">Welcome to OpenCode Insight</h1>
      <Card class="p-6">
        <p class="mb-4">
          Monitor your OpenCode sessions, analyze agent behavior, and configure your environment.
        </p>
        <div class="flex space-x-4">
          <A href="/sessions">
            <Button>View Sessions</Button>
          </A>
          <A href="/agent-monitor">
            <Button class="bg-purple-600 hover:bg-purple-700">Live Monitor</Button>
          </A>
        </div>
      </Card>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h2 class="text-xl font-bold mb-2">Recent Activity</h2>
          <p class="text-gray-500">No recent activity found.</p>
        </Card>
        <Card>
          <h2 class="text-xl font-bold mb-2">System Status</h2>
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Database Connected</span>
          </div>
          <div class="flex items-center space-x-2 mt-2">
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
            <span>WebSocket Active</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
