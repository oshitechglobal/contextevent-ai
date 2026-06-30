import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_PROTOCOLS = ["https:"];
const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB safety cap

// Domains we explicitly trust to proxy images from. Extend this list if you
// integrate additional enrichment providers with their own CDN hosts.
const ALLOWED_HOSTNAME_SUFFIXES = [
  "dicebear.com",
  "clearbit.com",
  "licdn.com", // LinkedIn media CDN
  "linkedin.com",
  "googleusercontent.com",
  "cloudfront.net",
  "media.licdn.com",
];

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTNAME_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
  );
}

export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing required 'url' query parameter." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return NextResponse.json({ error: "Only HTTPS image URLs are permitted." }, { status: 400 });
  }

  if (!isAllowedHost(parsed.hostname)) {
    return NextResponse.json(
      { error: `Image host "${parsed.hostname}" is not on the allowed proxy list.` },
      { status: 403 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "ContextEventAI-ImageProxy/1.0",
        Accept: "image/*",
      },
      redirect: "follow",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Upstream image fetch failed with status ${upstream.status}.` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Upstream resource is not an image." }, { status: 415 });
    }

    const contentLength = upstream.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
      return NextResponse.json({ error: "Image exceeds maximum allowed size." }, { status: 413 });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Image exceeds maximum allowed size." }, { status: 413 });
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: isAbort ? "Image fetch timed out." : "Failed to proxy image." },
      { status: isAbort ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
