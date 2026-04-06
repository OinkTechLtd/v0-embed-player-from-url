import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  try {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch the page',
          status: response.status,
        },
        { status: response.status },
      )
    }

    const html = await response.text()

    // Extract players from the HTML
    const playerData = extractPlayers(html, targetUrl)

    if (playerData.length === 0) {
      return NextResponse.json(
        {
          error: 'no_player',
          message: 'No embeddable video player found on this page.',
          sourceUrl: targetUrl,
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      players: playerData,
      sourceUrl: targetUrl,
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process the request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

interface PlayerInfo {
  type: 'iframe' | 'video' | 'embed' | 'object'
  src: string
  width?: string
  height?: string
}

function extractPlayers(html: string, pageUrl: string): PlayerInfo[] {
  const players: PlayerInfo[] = []

  // Extract iframes (most common for video embeds)
  const iframeRegex = /<iframe[^>]*\s+src=["']([^"']+)["'][^>]*>/gi
  let match

  while ((match = iframeRegex.exec(html)) !== null) {
    const src = resolveUrl(match[1], pageUrl)
    const fullTag = match[0]

    // Filter out non-video iframes (ads, tracking, etc.)
    if (isVideoPlayer(src, fullTag)) {
      players.push({
        type: 'iframe',
        src,
        width: extractAttribute(fullTag, 'width'),
        height: extractAttribute(fullTag, 'height'),
      })
    }
  }

  // Extract HTML5 video elements
  const videoRegex =
    /<video[^>]*(?:\s+src=["']([^"']+)["'])?[^>]*>(?:[\s\S]*?<source[^>]*\s+src=["']([^"']+)["'][^>]*>)?/gi

  while ((match = videoRegex.exec(html)) !== null) {
    const src = match[1] || match[2]
    if (src) {
      players.push({
        type: 'video',
        src: resolveUrl(src, pageUrl),
        width: extractAttribute(match[0], 'width'),
        height: extractAttribute(match[0], 'height'),
      })
    }
  }

  // Extract embed elements
  const embedRegex = /<embed[^>]*\s+src=["']([^"']+)["'][^>]*>/gi

  while ((match = embedRegex.exec(html)) !== null) {
    const src = resolveUrl(match[1], pageUrl)
    if (isVideoPlayer(src, match[0])) {
      players.push({
        type: 'embed',
        src,
      })
    }
  }

  // Extract object elements (older flash-style embeds)
  const objectRegex =
    /<object[^>]*>[\s\S]*?<param[^>]*name=["']?(?:movie|src)["']?[^>]*value=["']([^"']+)["'][^>]*>[\s\S]*?<\/object>/gi

  while ((match = objectRegex.exec(html)) !== null) {
    const src = resolveUrl(match[1], pageUrl)
    players.push({
      type: 'object',
      src,
    })
  }

  // Look for common video player patterns in data attributes
  const dataVideoRegex = /data-(?:video-?(?:url|src|id)|src|url|embed)=["']([^"']+)["']/gi

  while ((match = dataVideoRegex.exec(html)) !== null) {
    const src = match[1]
    if (src && isLikelyVideoSource(src)) {
      players.push({
        type: 'video',
        src: resolveUrl(src, pageUrl),
      })
    }
  }

  // Look for direct media links and player endpoints in inline scripts/JSON
  const scriptSourceRegex = /["']((?:https?:)?\/\/[^"']+(?:\.m3u8|\.mpd|\.mp4|\/embed\/[^"']+|\/player\/[^"']+))["']/gi

  while ((match = scriptSourceRegex.exec(html)) !== null) {
    const src = resolveUrl(match[1], pageUrl)
    if (isVideoPlayer(src, match[0])) {
      players.push({
        type: src.endsWith('.mp4') ? 'video' : 'iframe',
        src,
      })
    }
  }

  // Remove duplicates
  const uniquePlayers = players.filter((player, index, self) => index === self.findIndex((p) => p.src === player.src))

  return uniquePlayers
}

function resolveUrl(url: string, pageUrl: string): string {
  try {
    return new URL(url, pageUrl).toString()
  } catch {
    return url
  }
}

function extractAttribute(tag: string, attr: string): string | undefined {
  const regex = new RegExp(`${attr}=["']?([^"'\\s>]+)["']?`, 'i')
  const match = tag.match(regex)
  return match ? match[1] : undefined
}

function isLikelyVideoSource(src: string): boolean {
  const value = src.toLowerCase()
  return ['.m3u8', '.mp4', '.webm', '.mpd', '/embed/', '/player/', 'video'].some((pattern) => value.includes(pattern))
}

function isVideoPlayer(src: string, tag: string): boolean {
  const videoPatterns = [
    'youtube.com',
    'youtu.be',
    'vimeo.com',
    'dailymotion.com',
    'twitch.tv',
    'player',
    'embed',
    'video',
    'stream',
    '.m3u8',
    '.mp4',
    '.webm',
    '.flv',
    '.mov',
    'rutube.ru',
    'ok.ru',
    'vk.com',
    'dzen.ru',
    'kinogo',
    'hdrezka',
    'rezka',
    'cdnmovies',
    'videocdn',
    'iframe',
    'kodik',
    'bazon',
    'collaps',
    'hdvb',
    'alloha',
    'ashdi',
    'turbo',
    'sibnet',
    'myvi',
    'smotret',
    'seasonvar',
    'kinokrad',
    'kinoprofi',
    'filmix',
    'lordfilm',
    'kinopub',
    'videoframe',
    'pleer',
    'mail.ru/video',
    'rambler',
    'ntv',
    'tnt-online',
    'ivi.ru',
    'okko',
    'kinopoisk',
    'more.tv',
    'wink.ru',
    'start.ru',
    'premier',
    'amediateka',
    'yootv.host',
  ]

  const srcLower = src.toLowerCase()
  const tagLower = tag.toLowerCase()

  // Exclude common non-video iframes
  const excludePatterns = [
    'google.com/recaptcha',
    'googletagmanager',
    'google-analytics',
    'facebook.com/plugins',
    'twitter.com/widgets',
    'disqus.com',
    'addthis.com',
    'sharethis.com',
    'doubleclick',
    'googlesyndication',
    'yandex.ru/metrika',
    'mc.yandex.ru',
    'counter',
    'pixel',
    'beacon',
  ]

  if (excludePatterns.some((pattern) => srcLower.includes(pattern))) {
    return false
  }

  return videoPatterns.some((pattern) => srcLower.includes(pattern) || tagLower.includes(pattern))
}
