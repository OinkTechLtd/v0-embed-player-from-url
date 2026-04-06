import { NextRequest, NextResponse } from 'next/server'

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])
const REQUEST_TIMEOUT_MS = 12000
const MAX_RETRIES = 3

interface PlayerInfo {
  type: 'iframe' | 'video' | 'embed' | 'object'
  src: string
  width?: string
  height?: string
}

interface FetchResult {
  response: Response
  html: string
}

const KNOWN_BROADCASTER_HOSTS = ['ntv.ru', 'vgtrk.ru', 'smotrim.ru', 'rtr-planeta.com', 'player.vgtrk.com', 'player.smotrim.ru']

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  const targetUrl = normalizeUrl(url)
  if (!targetUrl) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const result = await fetchHtmlWithRetry(targetUrl)
    const contentType = result.response.headers.get('content-type')?.toLowerCase() || ''

    if (contentType.includes('video/') || targetUrl.match(/\.(m3u8|mpd|mp4|webm)(\?|$)/i)) {
      return NextResponse.json({
        success: true,
        sourceUrl: targetUrl,
        players: [{ type: 'video', src: targetUrl }],
      })
    }

    const playerData = extractPlayers(result.html, targetUrl)

    if (playerData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'no_player',
        message: 'Direct player source was not found on this page.',
        sourceUrl: targetUrl,
      })
    }

    return NextResponse.json({
      success: true,
      players: playerData,
      sourceUrl: targetUrl,
    })
  } catch (error) {
    console.error('Proxy error:', error)

    return NextResponse.json({
      success: false,
      error: 'upstream_fetch_failed',
      message: 'Could not extract a direct player source.',
      sourceUrl: targetUrl,
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

async function fetchHtmlWithRetry(targetUrl: string): Promise<FetchResult> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(targetUrl, {
        headers: buildUpstreamHeaders(),
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
      })

      if (!response.ok) {
        if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES) {
          await backoff(attempt)
          continue
        }

        throw new Error(`Upstream response ${response.status}`)
      }

      const html = await response.text()
      return { response, html }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown upstream fetch error')

      if (attempt < MAX_RETRIES) {
        await backoff(attempt)
        continue
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError || new Error('Failed to fetch upstream page')
}

function backoff(attempt: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 250)
  const delay = 350 * 2 ** (attempt - 1) + jitter
  return new Promise((resolve) => setTimeout(resolve, delay))
}

function normalizeUrl(value: string): string | null {
  try {
    const url = value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`
    return new URL(url).toString()
  } catch {
    return null
  }
}

function buildUpstreamHeaders() {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
    Connection: 'keep-alive',
    DNT: '1',
    'Upgrade-Insecure-Requests': '1',
  }
}

function extractPlayers(html: string, pageUrl: string): PlayerInfo[] {
  const players: PlayerInfo[] = []
  const normalizedHtml = html.replace(/\\\//g, '/')

  const iframeRegex = /<iframe[^>]*\s+src=["']([^"']+)["'][^>]*>/gi
  let match

  while ((match = iframeRegex.exec(normalizedHtml)) !== null) {
    const src = resolveUrl(match[1], pageUrl)
    const fullTag = match[0]

    if (isVideoPlayer(src, fullTag)) {
      players.push({
        type: 'iframe',
        src,
        width: extractAttribute(fullTag, 'width'),
        height: extractAttribute(fullTag, 'height'),
      })
    }
  }

  const videoRegex =
    /<video[^>]*(?:\s+src=["']([^"']+)["'])?[^>]*>(?:[\s\S]*?<source[^>]*\s+src=["']([^"']+)["'][^>]*>)?/gi

  while ((match = videoRegex.exec(normalizedHtml)) !== null) {
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

  const embedRegex = /<embed[^>]*\s+src=["']([^"']+)["'][^>]*>/gi

  while ((match = embedRegex.exec(normalizedHtml)) !== null) {
    const src = resolveUrl(match[1], pageUrl)
    if (isVideoPlayer(src, match[0])) {
      players.push({
        type: 'embed',
        src,
      })
    }
  }

  const objectRegex =
    /<object[^>]*>[\s\S]*?<param[^>]*name=["']?(?:movie|src)["']?[^>]*value=["']([^"']+)["'][^>]*>[\s\S]*?<\/object>/gi

  while ((match = objectRegex.exec(normalizedHtml)) !== null) {
    const src = resolveUrl(match[1], pageUrl)
    if (isVideoPlayer(src, match[0])) {
      players.push({
        type: 'object',
        src,
      })
    }
  }

  const dataVideoRegex = /data-(?:video-?(?:url|src|id)|src|url|embed)=["']([^"']+)["']/gi

  while ((match = dataVideoRegex.exec(normalizedHtml)) !== null) {
    const src = match[1]
    if (src && isLikelyVideoSource(src)) {
      players.push({
        type: 'video',
        src: resolveUrl(src, pageUrl),
      })
    }
  }

  const scriptSourceRegex = /["']((?:https?:)?\/\/[^"']+(?:\.m3u8|\.mpd|\.mp4|\/embed\/[^"']+|\/player\/[^"']+))["']/gi

  while ((match = scriptSourceRegex.exec(normalizedHtml)) !== null) {
    const src = resolveUrl(match[1], pageUrl)
    if (isVideoPlayer(src, match[0])) {
      players.push({
        type: src.endsWith('.mp4') ? 'video' : 'iframe',
        src,
      })
    }
  }

  const discoveredScriptUrls = extractScriptLikeUrls(normalizedHtml, pageUrl)
  for (const src of discoveredScriptUrls) {
    if (isVideoPlayer(src, src)) {
      players.push({
        type: getPlayerType(src),
        src,
      })
    }
  }

  const broadcasterPlayers = extractBroadcasterPlayers(normalizedHtml, pageUrl)
  players.push(...broadcasterPlayers)

  const metadataPlayers = extractMetadataPlayers(normalizedHtml, pageUrl)
  players.push(...metadataPlayers)

  return players
    .filter((player, index, self) => index === self.findIndex((p) => p.src === player.src))
    .filter((player) => !isLikelyNonPlayerPage(player.src))
    .sort((a, b) => getPlayerScore(b.src) - getPlayerScore(a.src))
}

function extractBroadcasterPlayers(html: string, pageUrl: string): PlayerInfo[] {
  const players: PlayerInfo[] = []
  const decodedHtml = html
    .replace(/\\u002F/gi, '/')
    .replace(/\\u003A/gi, ':')
    .replace(/\\x2f/gi, '/')
    .replace(/&quot;/gi, '"')

  const matches = new Set<string>()
  const broadcasterUrlRegex =
    /(?:https?:)?\/\/(?:player\.)?(?:ntv\.ru|vgtrk\.ru|smotrim\.ru|rtr-planeta\.com|vgtrk\.com)[^\s"'<>\\]*/gi

  let match
  while ((match = broadcasterUrlRegex.exec(decodedHtml)) !== null) {
    const resolved = resolveUrl(match[0], pageUrl)
    matches.add(resolved)
  }

  const broadcasterPlayerFieldRegex =
    /["'](?:embed(?:_url|Url)?|player(?:_url|Url)?|video(?:_url|Url)?|stream(?:_url|Url)?|src)["']\s*[:=]\s*["']([^"']+)["']/gi

  while ((match = broadcasterPlayerFieldRegex.exec(decodedHtml)) !== null) {
    const candidate = match[1]
    if (/(?:ntv\.ru|vgtrk\.ru|smotrim\.ru|rtr-planeta\.com|vgtrk\.com|\.m3u8|\.mpd|\/player\/|\/embed\/)/i.test(candidate)) {
      matches.add(resolveUrl(candidate, pageUrl))
    }
  }

  try {
    const parsed = new URL(pageUrl)
    const isBroadcasterHost = KNOWN_BROADCASTER_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))
    const videoIdMatch = parsed.pathname.match(/\/video\/(\d+)/i)
    if (isBroadcasterHost && videoIdMatch) {
      const videoId = videoIdMatch[1]
      matches.add(`https://player.smotrim.ru/iframe/video/id/${videoId}`)
      matches.add(`https://player.vgtrk.com/iframe/video/id/${videoId}`)
      matches.add(`https://player.vgtrk.ru/iframe/video/id/${videoId}`)
      matches.add(`https://www.ntv.ru/video/${videoId}/`)
    }
  } catch {
    // Ignore URL parsing errors and continue with discovered matches.
  }

  for (const src of matches) {
    if (isVideoPlayer(src, src)) {
      players.push({
        type: getPlayerType(src),
        src,
      })
    }
  }

  return players
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
  return [
    '.m3u8',
    '.mp4',
    '.webm',
    '.mpd',
    '.m3u',
    '/embed/',
    '/player/',
    '/playlist/',
    'video',
    'stream',
    'manifest',
  ].some((pattern) => value.includes(pattern))
}

function getPlayerType(src: string): PlayerInfo['type'] {
  const value = src.toLowerCase()
  if (value.endsWith('.mp4') || value.endsWith('.m3u8') || value.endsWith('.mpd') || value.includes('/hls/')) {
    return 'video'
  }
  return 'iframe'
}

function extractScriptLikeUrls(html: string, pageUrl: string): string[] {
  const decodedHtml = html
    .replace(/\\u002F/gi, '/')
    .replace(/\\u003A/gi, ':')
    .replace(/\\x2f/gi, '/')
    .replace(/&quot;/gi, '"')

  const matches = new Set<string>()
  const urlRegex =
    /(?:https?:)?\/\/[^\s"'<>\\]+(?:\.m3u8|\.mpd|\.mp4|\/embed\/[^\s"'<>\\]*|\/player\/[^\s"'<>\\]*|\/playlist\/[^\s"'<>\\]*)/gi

  let match
  while ((match = urlRegex.exec(decodedHtml)) !== null) {
    const resolved = resolveUrl(match[0], pageUrl)
    if (isLikelyVideoSource(resolved)) {
      matches.add(resolved)
    }
  }

  const ruBroadcasterHintRegex =
    /(?:player\.)?(?:ntv\.ru|vgtrk\.ru|smotrim\.ru|rtr-planeta\.com)[^\s"'<>\\]*/gi

  while ((match = ruBroadcasterHintRegex.exec(decodedHtml)) !== null) {
    const maybeUrl = match[0].startsWith('http') ? match[0] : `https://${match[0]}`
    const resolved = resolveUrl(maybeUrl, pageUrl)
    if (isLikelyVideoSource(resolved)) {
      matches.add(resolved)
    }
  }

  return [...matches]
}

function extractMetadataPlayers(html: string, pageUrl: string): PlayerInfo[] {
  const players: PlayerInfo[] = []
  const metadataRegex =
    /<meta[^>]+(?:property|name)=["'](?:og:video(?::secure_url)?|twitter:player|vk:player)["'][^>]+content=["']([^"']+)["'][^>]*>/gi

  let match
  while ((match = metadataRegex.exec(html)) !== null) {
    const src = resolveUrl(match[1], pageUrl)
    if (isVideoPlayer(src, match[0])) {
      players.push({
        type: getPlayerType(src),
        src,
      })
    }
  }

  return players
}

function isLikelyNonPlayerPage(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname.toLowerCase()
    const full = `${host}${path}${parsed.search}`.toLowerCase()

    if (/\.(m3u8|mpd|mp4|webm|m3u)(\?|$)/i.test(full)) {
      return false
    }

    if (/(embed|player|iframe|stream|playlist|manifest|hls|dash|live|video)/i.test(full)) {
      return false
    }

    const isKnownBroadcaster = KNOWN_BROADCASTER_HOSTS.some((broadcasterHost) => host === broadcasterHost || host.endsWith(`.${broadcasterHost}`))
    if (isKnownBroadcaster) {
      const broadcasterPlayerHints = /(embed|player|iframe|stream|playlist|manifest|hls|dash|live|video|smotri|vod)/i
      return !broadcasterPlayerHints.test(full)
    }

    if (path === '/' || path === '') {
      return true
    }

    return false
  } catch {
    return false
  }
}

function getPlayerScore(url: string): number {
  const value = url.toLowerCase()

  if (/\.(m3u8|mpd|mp4|webm|m3u)(\?|$)/i.test(value)) {
    return 100
  }

  if (/(manifest|playlist|hls|dash|stream)/i.test(value)) {
    return 80
  }

  if (/(player|embed|iframe)/i.test(value)) {
    return 70
  }

  if (/live|video/.test(value)) {
    return 60
  }

  return 10
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

  if (!videoPatterns.some((pattern) => srcLower.includes(pattern) || tagLower.includes(pattern))) {
    return false
  }

  return !isLikelyNonPlayerPage(srcLower)
}
