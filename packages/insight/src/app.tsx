import { ErrorBoundary, Suspense } from "solid-js";
import { Body, FileRoutes, Head, Html, Meta, Routes, Scripts, Title } from "solid-start";
import Layout from "./ui/layout";
import "./app.css";

export default function App() {
  return (
    <Html lang="en">
      <Head>
        <Title>OpenCode Insight</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Body>
        <ErrorBoundary fallback={(err) => <div class="p-10 text-red-500">Error: {err.toString()}</div>}>
          <Suspense>
            <Layout>
              <Routes>
                <FileRoutes />
              </Routes>
            </Layout>
          </Suspense>
        </ErrorBoundary>
        <Scripts />
      </Body>
    </Html>
  );
}
