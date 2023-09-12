import { describe, expect, test } from "vitest";

import {
  type Post,
  type Meta,
  loadPost,
  loadAllPosts,
  filePathToSlug,
  dataToMeta,
} from "./post";

import { parseISO } from "date-fns";

describe("post", () => {
  test("filePathToSlug", () => {
    const input = "/sample/path/to/file.md";
    const expected = "file";
    const result = filePathToSlug(input);
    expect(result).toBe(expected);
  });

  test("dataToMeta", () => {
    const input = {
      title: "title",
      date: "2023-09-13",
      tags: "Tag1, Ta/g2, *&^%, Tag1",
      imagePath: "/blog/image.png",
      photoByName: "Photo by Name",
      photoByUrl: "http://example.com",
      photoOnName: "Photo on Name",
      photoOnUrl: "http://example.com",
    };
    const expected: Meta = {
      title: "title",
      date: parseISO("2023-09-13"),
      tags: ["*&^%", "ta/g2", "tag1"],
      imagePath: "/blog/image.png",
      photoBy: {
        name: "Photo by Name",
        url: "http://example.com",
      },
      photoOn: {
        name: "Photo on Name",
        url: "http://example.com",
      },
    };
    const result = dataToMeta(input);
    expectMetaToBeEqual(result, expected);
  });

  const examplePost: Post = {
    slug: "example",
    html: '<h1 id="header"><a href="#header">Header</a></h1>\n' + "<p>text</p>",
    meta: {
      title: "Example タイトル",
      date: parseISO("2023-01-31"),
      tags: ["c++", "tcp/ip"],
      imagePath: "/blog/image.png",
      photoBy: {
        name: "Photo by Name",
        url: "http://example.com",
      },
      photoOn: {
        name: "Photo on Name",
        url: "http://example.com",
      },
    },
  };

  test("loadPost", async () => {
    const input = `${__dirname}/example.md`;

    const html =
      '<h1 id="header"><a aria-hidden="true" tabindex="-1" href="#header"><span class="icon icon-link"></span></a>Header</h1>\n' +
      "<p>text</p>";

    const expected: Post = examplePost;
    const result = await loadPost(input);
    expectPostToBeEqual(result, expected);
  });

  test("loadAllPosts", async () => {
    const html =
      '<h1 id="header"><a aria-hidden="true" tabindex="-1" href="#header"><span class="icon icon-link"></span></a>Header</h1>\n' +
      "<p>text</p>";

    const expected: Post[] = [examplePost];
    const result = await loadAllPosts(__dirname, ".md");
    expectPostToBeEqual(result[0], expected[0]);
  });

  const expectMetaToBeEqual: (a: Meta, b: Meta) => void = (a, b) => {
    expect(a.title).toBe(b.title);
    expect(a.date.getTime()).toBe(b.date.getTime());
    expect(a.tags).toStrictEqual(b.tags);
    expect(a.imagePath).toBe(b.imagePath);
    expect(a.photoBy).toStrictEqual(b.photoBy);
    expect(a.photoOn).toStrictEqual(b.photoOn);
  };

  const expectPostToBeEqual: (a: Post, b: Post) => void = (a, b) => {
    expectMetaToBeEqual(a.meta, b.meta);
    expect(a.slug).toBe(b.slug);
    expect(a.html).toBe(b.html);
  };
});
