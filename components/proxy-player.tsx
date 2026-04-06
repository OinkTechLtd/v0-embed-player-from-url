"use client"

import { useEffect, useState } from "react"
import { AlertCircle, ArrowLeft, Code, Copy, Check, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface PlayerInfo {
  type: 'iframe' | 'video' | 'embed' | 'object'
  src: string
  width?: string
  height?: string
}

interface ProxyResult {
  success?: boolean
  error?: string
  message?: string
  players?: PlayerInfo[]
  sourceUrl?: string
}

interface ProxyPlayerProps {
  url: string
}

export function ProxyPlayer({ url }: ProxyPlayerProps) {
  const [data, setData] = useState<ProxyResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState(0)
  const [copied, setCopied] = useState(false)
  const [showEmbedCode, setShowEmbedCode] = useState(false)

  const fetchPlayer = async () => {
    setLoading(true)
    const targetUrl = url.startsWith('http') ? url : `https://${url}`

    try {
      let result: ProxyResult | null = null

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)

        try {
          const response = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`, {
            cache: "no-store",
            signal: controller.signal,
          })

          result = await response.json()

          if (response.ok || attempt === 3) {
            break
          }
        } catch (error) {
          if (attempt === 3) {
            throw error
          }
        } finally {
          clearTimeout(timeout)
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 500))
      }

      setData(result)
    } catch {
      setData({
        error: "fetch_error",
        message: "Failed to connect after several retries. Проверьте интернет и попробуйте снова.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlayer()
  }, [url])

  const copyEmbedCode = () => {
    if (!data?.players?.[selectedPlayer]) return
    
    const player = data.players[selectedPlayer]
    const embedCode = `<iframe src="${player.src}" width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay; fullscreen; picture-in-picture"></iframe>`
    
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Extracting video player...</p>
          <p className="text-sm text-muted-foreground/60 mt-2 font-mono">{url}</p>
        </div>
      </div>
    )
  }

  // Error state - no player found
  if (data?.error) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Player Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            {data.error === 'no_player' 
              ? 'No video player was found on this page. Please try a URL that contains a video player.'
              : data.message || 'An error occurred while processing your request.'}
          </p>
          <div className="bg-card border border-border rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-muted-foreground mb-2">Requested URL:</p>
            <code className="text-sm text-foreground break-all">{url}</code>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Try Another URL
              </Link>
            </Button>
            <Button onClick={fetchPlayer} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Success state - show player
  const players = data?.players || []
  const currentPlayer = players[selectedPlayer]

  if (!currentPlayer) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black">
      <div className="absolute top-3 right-3 z-20">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowEmbedCode(!showEmbedCode)}
          className="h-9 gap-1.5 text-xs shadow-lg"
        >
          <Code className="h-3.5 w-3.5" />
          <span>Embed</span>
          {showEmbedCode ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Embed Code Panel */}
      {showEmbedCode && (
        <div className="absolute top-14 right-3 z-20 w-[min(94vw,560px)] rounded-xl border border-border bg-card/95 backdrop-blur p-3 shadow-lg">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1.5">Embed Code:</p>
              <code className="block bg-secondary rounded-lg p-2 text-xs text-foreground break-all overflow-x-auto">
                {`<iframe src="${currentPlayer.src}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`}
              </code>
              {players.length > 1 && (
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(Number(e.target.value))}
                  className="mt-2 h-8 w-full rounded-lg bg-secondary border-0 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {players.map((player, index) => (
                    <option key={index} value={index}>
                      Source {index + 1} ({player.type})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyEmbedCode}
              className="h-8 gap-1.5 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Player - full viewport */}
      <div className="relative h-full w-full">
        {currentPlayer.type === 'video' ? (
          <video
            src={currentPlayer.src}
            controls
            autoPlay
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'contain' }}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <iframe
            src={currentPlayer.src}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>
    </div>
  )
}
