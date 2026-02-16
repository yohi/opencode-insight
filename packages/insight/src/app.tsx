import { Suspense } from "solid-js";
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
        <Suspense>
          <Layout>
            <Routes>
              <FileRoutes />
            </Routes>
          </Layout>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  );
}
