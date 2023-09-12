import { siteName } from "@/app/layout";

import { ImageResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const title = queryTitle(req);
    const font = await fetchFont(title);
    if (font === null) {
      return error("fetch font");
    }

    return new ImageResponse(
      (
        <div
          style={{
            backgroundColor: "#393e46",
            color: "#eeeeee",
            height: "100%",
            width: "100%",
            padding: "0 120px",
            display: "flex",
            textAlign: "left",
            alignItems: "flex-start",
            justifyContent: "center",
            flexDirection: "column",
            flexWrap: "nowrap",
            fontStyle: "normal",
            fontWeight: "bold",
          }}
        >
          <div
            style={{
              width: "100%",
              fontSize: 60,
              marginBottom: "30px",

              wordWrap: "break-word",
            }}
          >
            {title}
          </div>

          <div
            style={{
              width: "100%",
              fontSize: 40,
              borderBottom: "4px solid #04c4ce",
            }}
          >
            {siteName}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Noto Sans JP",
            data: font,
            style: "normal",
            weight: 400,
          },
        ],
      }
    );
  } catch (e: any) {
    console.log(e);
    return error("ImageResponse");
  }
}

/**
 * fetch Noto Sans JP from Google Fonts of specified string.
 * @param text text to be fetched.
 * @returns font.
 */
async function fetchFont(text: string): Promise<ArrayBuffer | null> {
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP&text=${encodeURIComponent(
    text
  )}`;

  const css = await (await fetch(googleFontsUrl)).text();
  const resource = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/
  );

  if (!resource) {
    return null;
  }
  return (await fetch(resource[1])).arrayBuffer();
}

const error: (err: string) => Response = (err) => {
  return new Response(`Failed to generate the image (${err})`, {
    status: 500,
  });
};

const queryTitle: (req: NextRequest) => string = (req) => {
  const { searchParams } = new URL(req.url);
  const title = "title";
  return searchParams.has(title) ? searchParams.get(title)! : "";
};
