import { NextRequest, NextResponse } from "next/server"

function removeFrameBusters(html: string): string {
  return html
    .replace(/if\s*\(\s*top\s*!==\s*self\s*\)\s*top\.location\s*=\s*self\.location;?/gi, "")
    .replace(/window\.top\.location\s*=\s*window\.self\.location;?/gi, "")
    .replace(/top\.location\.href\s*=\s*location\.href;?/gi, "")
}

function injectProxySupport(html: string, targetUrl: string, originalHash: string): string {
  const headInjection = `
<base href="${targetUrl}">
<script>
  try {
    if (window.top !== window.self) {
      window.open = (url, target, features) => {
        if (!target || target === "_self" || target === "_blank") {
          return window.location.assign(url)
        }
        return null
      }
    }
    const originalHash = ${JSON.stringify(originalHash)};
    if (originalHash && !window.location.hash) {
      window.location.hash = originalHash;
    }
  } catch (e) {}
</script>
`

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (headTag) => `${headTag}${headInjection}`)
  }

  return `<!doctype html><html><head>${headInjection}</head><body>${html}</body></html>`
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  try {
    const targetUrl = url.startsWith("http") ? url : `https://${url}`
    const parsedUrl = new URL(targetUrl)
    const originalHash = parsedUrl.hash
    parsedUrl.hash = ""

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "Upgrade-Insecure-Requests": "1",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch the page",
          status: response.status,
        },
        { status: response.status },
      )
    }

    const html = await response.text()
    const cleanedHtml = removeFrameBusters(html)
    const processedHtml = injectProxySupport(cleanedHtml, parsedUrl.toString(), originalHash)

    return new NextResponse(processedHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Frame-Options": "SAMEORIGIN",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process the request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
