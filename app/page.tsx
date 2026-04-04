"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Play, ArrowRight, Code, Zap, Globe, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    
    setIsLoading(true)
    // Clean URL - remove protocol for cleaner path
    let cleanUrl = url.trim()
    if (cleanUrl.startsWith('http://')) {
      cleanUrl = cleanUrl.substring(7)
    } else if (cleanUrl.startsWith('https://')) {
      cleanUrl = cleanUrl.substring(8)
    }
    
    router.push(`/proxy/${encodeURIComponent(cleanUrl)}`)
  }

  const exampleUrls = [
    "example-streaming-site.com/video/123",
    "video-portal.ru/watch/456",
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Play className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">EmbedProxy</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
            <Zap className="h-4 w-4" />
            Video Player Extraction Service
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
            Extract & Embed Video Players<br />
            <span className="text-primary">From Any Website</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
            Paste a URL with a video player and get a clean, fullscreen embed.
            Works with sites that don&apos;t support native embedding.
          </p>
        </div>

        {/* URL Input Form */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-16">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL with video player..."
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <Button 
              type="submit" 
              size="lg"
              disabled={isLoading || !url.trim()}
              className="h-14 px-8 rounded-xl text-base font-medium"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Loading...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Extract Player
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3 text-center">
            Example: yoursite.com/{'{url-with-video}'}
          </p>
        </form>

        {/* How it Works */}
        <section id="how-it-works" className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <span className="text-xl font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Paste the URL
              </h3>
              <p className="text-muted-foreground">
                Enter the URL of any page that contains a video player you want to extract.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <span className="text-xl font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                We Extract the Player
              </h3>
              <p className="text-muted-foreground">
                Our system analyzes the page and extracts all video player elements.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <span className="text-xl font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Fullscreen Player
              </h3>
              <p className="text-muted-foreground">
                Get a clean, fullscreen video player without any website clutter.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">
            Features
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 bg-card border border-border rounded-2xl p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Monitor className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Fullscreen Display
                </h3>
                <p className="text-muted-foreground">
                  Video players are displayed in fullscreen mode, without website navigation or ads.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-card border border-border rounded-2xl p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Code className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Embed Support
                </h3>
                <p className="text-muted-foreground">
                  Get embed codes for sites that don&apos;t provide native embedding options.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-card border border-border rounded-2xl p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Multiple Sources
                </h3>
                <p className="text-muted-foreground">
                  Supports various video platforms and streaming services.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-card border border-border rounded-2xl p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Fast Extraction
                </h3>
                <p className="text-muted-foreground">
                  Quick processing and immediate player display.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Example URLs */}
        <section className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            URL Format
          </h2>
          <div className="inline-block bg-card border border-border rounded-xl p-4 text-left font-mono text-sm">
            <p className="text-muted-foreground mb-2">Use the following format:</p>
            <code className="text-primary">
              {typeof window !== 'undefined' ? window.location.origin : 'https://yoursite.com'}/proxy/
              <span className="text-foreground">{'example.com/video/123'}</span>
            </code>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-muted-foreground text-sm">
          <p>EmbedProxy - Video Player Extraction Service</p>
        </div>
      </footer>
    </div>
  )
}
