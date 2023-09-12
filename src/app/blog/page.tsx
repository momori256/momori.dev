import Blog from "@/components/templates/blog/blog";
import { loadAllPosts } from "@/lib/blog";

const Page: React.FC = async () => {
  const posts = await loadAllPosts();
  return <Blog posts={posts} />;
};

export default Page;
