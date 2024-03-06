import "./globals.scss";
import type { Metadata } from "next";

import { getBaseUrl } from "@/lib/url";
import Footer from "@/components/organisms/footer/footer";

import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import Head from "next/head";
config.autoAddCss = false;

export const siteName = "momori.dev";

const buildMetadata: () => Metadata = () => {
  const title = siteName;
  const description = "Momori Nakano's portfolio";
  const url = getBaseUrl();
  return {
    title,
    description,
    metadataBase: getBaseUrl(),
    openGraph: {
      title,
      description,
      url,
      siteName: title,
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: "@momori256",
      creator: "@momori256",
    },
  };
};

export const metadata: Metadata = buildMetadata();

export enum Routes {
  Home = "/",
  Blog = "/blog",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <Head>
        <link // rehype-katex.
          rel={"stylesheet"}
          href={"https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css"}
          integrity={
            "sha384-Xi8rHCmBmhbuyyhbI88391ZKP2dmfnOl4rT9ZfRI7mLTdk1wblIUnrIq35nqwEvC"
          }
          crossOrigin={"anonymous"}
        />
      </Head>

      <body>
        {children}
        <footer>
          <Footer />
        </footer>
      </body>
    </html>
  );
}
