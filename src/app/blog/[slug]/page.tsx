import Post from "@/components/templates/post/post";
import { Routes } from "@/app/layout";
import { getBaseUrl } from "@/lib/url";
import { loadPost } from "@/lib/blog";
import { siteName } from "@/app/layout";

import { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: { slug: string };
};

const buildOgApi: (title: string) => URL = (title) => {
  const url = new URL("api/og", getBaseUrl());
  url.searchParams.append("title", title);
  return url;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const post = await loadPost(params.slug);

  const title = `${post.meta.title} - ${siteName}`;
  const description = "";
  const url = new URL(`${Routes.Blog}/${post.slug}`, getBaseUrl());
  const ogApi = buildOgApi(post.meta.title);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [ogApi],
      url,
      siteName,
    },
    twitter: {
      title,
      description,
      card: "summary_large_image",
      images: [ogApi],
      site: "@momori256",
      creator: "@momori256",
    },
  };
}

const Page = async ({ params }: Props) => {
  const post = await loadPost(params.slug);
  return <Post post={post} />;
};

export default Page;
