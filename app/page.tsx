"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Play, ArrowRight, Code, Zap, Globe, Monitor, Languages, CircleHelp, BookOpenText } from "lucide-react"
import { Button } from "@/components/ui/button"

type Locale = "en" | "ru"

const copy = {
  en: {
    badge: "Stable video proxy with retries",
    how: "How it works",
    features: "Features",
    docs: "Docs",
    faq: "FAQ",
    heroTitleA: "Extract & Embed Video Players",
    heroTitleB: "From Any Website",
    heroText:
      "Paste a URL with a video player and get a clean fullscreen embed. Built for more stable playback and fewer random proxy failures.",
    inputPlaceholder: "Enter URL with video player...",
    loading: "Loading...",
    action: "Extract Player",
    step1Title: "Paste URL",
    step1Text: "Insert the page URL containing a video player.",
    step2Title: "We detect sources",
    step2Text: "Proxy scans iframe/video/embed and common player scripts.",
    step3Title: "Open fullscreen",
    step3Text: "Player opens in a clean fullscreen view.",
    f1Title: "Retry protection",
    f1Text: "Automatic retries and timeout handling reduce random outages.",
    f2Title: "Embed support",
    f2Text: "Copy iframe embed code for your own site.",
    f3Title: "Multiple sources",
    f3Text: "If several players are found, you can switch between them.",
    f4Title: "Fallback mode",
    f4Text: "If direct source is blocked, proxied-page fallback is used.",
    format: "URL Format",
    formatText: "Use the following format:",
    docsTitle: "Docs",
    docsItem1Title: "Quick Start",
    docsItem1Text: "Paste a page URL on the main screen and open /proxy/{target-url}.",
    docsItem2Title: "Embed on your website",
    docsItem2Text: "Use the Embed button in the player view to copy iframe code with your own domain.",
    docsItem3Title: "API Endpoints",
    docsItem3Text: "GET /api/proxy for source extraction and /api/proxy/page for fallback rendering.",
    faqTitle: "FAQ",
    faqItem1Q: "Why does embed use my domain?",
    faqItem1A: "So your website always points to your proxy player URL instead of third-party player links.",
    faqItem2Q: "Can I embed blocked players?",
    faqItem2A: "If direct source fails, fallback mode loads the proxied page when possible.",
    faqItem3Q: "What URL should I open directly?",
    faqItem3A: "Use /proxy/{encoded-target-url}. Example is shown below in URL format.",
    footer: "EmbedProxy - stable video extraction service",
    lang: "Русский",
  },
  ru: {
    badge: "Стабильный видеопрокси с ретраями",
    how: "Как это работает",
    features: "Возможности",
    docs: "Документация",
    faq: "FAQ",
    heroTitleA: "Извлечение и встраивание плеера",
    heroTitleB: "С любого сайта",
    heroText:
      "Вставьте ссылку на страницу с видео и получите чистый fullscreen-плеер. Сделано для более стабильной работы и меньшего числа случайных сбоев прокси.",
    inputPlaceholder: "Введите URL страницы с плеером...",
    loading: "Загрузка...",
    action: "Извлечь плеер",
    step1Title: "Вставьте URL",
    step1Text: "Укажите ссылку на страницу, где есть видеоплеер.",
    step2Title: "Ищем источники",
    step2Text: "Прокси анализирует iframe/video/embed и скрипты плеера.",
    step3Title: "Откройте fullscreen",
    step3Text: "Плеер откроется в чистом полноэкранном режиме.",
    f1Title: "Защита ретраями",
    f1Text: "Автоматические повторы и таймауты уменьшают случайные падения.",
    f2Title: "Поддержка embed",
    f2Text: "Скопируйте iframe-код и вставьте на свой сайт.",
    f3Title: "Несколько источников",
    f3Text: "Если найдено несколько плееров, можно переключаться между ними.",
    f4Title: "Режим fallback",
    f4Text: "Если прямой источник блокируется, включается прокси-страница.",
    format: "Формат URL",
    formatText: "Используйте такой формат:",
    docsTitle: "Документация",
    docsItem1Title: "Быстрый старт",
    docsItem1Text: "Вставьте ссылку на страницу и откройте /proxy/{target-url}.",
    docsItem2Title: "Встраивание на сайт",
    docsItem2Text: "Кнопка Embed в плеере копирует iframe с вашим доменом, а не со стороннего сайта.",
    docsItem3Title: "API endpoints",
    docsItem3Text: "GET /api/proxy извлекает источники, а /api/proxy/page используется как fallback.",
    faqTitle: "FAQ",
    faqItem1Q: "Почему embed теперь с моим доменом?",
    faqItem1A: "Чтобы встраивание всегда шло через ваш прокси-плеер и не ломалось из-за прямых ссылок источника.",
    faqItem2Q: "Можно ли встраивать заблокированные плееры?",
    faqItem2A: "Если прямой источник недоступен, включается fallback-режим с проксированной страницей.",
    faqItem3Q: "Какой URL открывать напрямую?",
    faqItem3A: "Используйте /proxy/{encoded-target-url}. Пример показан ниже в блоке формата.",
    footer: "EmbedProxy - сервис стабильного извлечения плееров",
    lang: "English",
  },
}

export default function HomePage() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [origin, setOrigin] = useState("https://yoursite.com")
  const [locale, setLocale] = useState<Locale>("en")
  const router = useRouter()

  useEffect(() => {
    setOrigin(window.location.origin)
    if (navigator.language.toLowerCase().startsWith("ru")) {
      setLocale("ru")
    }
  }, [])

  const t = copy[locale]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setIsLoading(true)
    let cleanUrl = url.trim()
    if (cleanUrl.startsWith("http://")) {
      cleanUrl = cleanUrl.substring(7)
    } else if (cleanUrl.startsWith("https://")) {
      cleanUrl = cleanUrl.substring(8)
    }

    router.push(`/proxy/${encodeURIComponent(cleanUrl)}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Play className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">EmbedProxy</span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                {t.how}
              </a>
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                {t.features}
              </a>
              <a href="#docs" className="text-muted-foreground hover:text-foreground transition-colors">
                {t.docs}
              </a>
              <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
                {t.faq}
              </a>
            </nav>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocale((prev) => (prev === "en" ? "ru" : "en"))}
              className="gap-1.5"
            >
              <Languages className="h-4 w-4" />
              {t.lang}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
            <Zap className="h-4 w-4" />
            {t.badge}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
            {t.heroTitleA}<br />
            <span className="text-primary">{t.heroTitleB}</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">{t.heroText}</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-16">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t.inputPlaceholder}
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <Button type="submit" size="lg" disabled={isLoading || !url.trim()} className="h-14 px-8 rounded-xl text-base font-medium">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {t.loading}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {t.action}
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </div>
        </form>

        <section id="how-it-works" className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">{t.how}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[{ title: t.step1Title, text: t.step1Text }, { title: t.step2Title, text: t.step2Text }, { title: t.step3Title, text: t.step3Text }].map((item, index) => (
              <div key={item.title} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <span className="text-xl font-bold">{index + 1}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">{t.features}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Monitor, title: t.f1Title, text: t.f1Text },
              { icon: Code, title: t.f2Title, text: t.f2Text },
              { icon: Globe, title: t.f3Title, text: t.f3Text },
              { icon: Zap, title: t.f4Title, text: t.f4Text },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 bg-card border border-border rounded-2xl p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="docs" className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">{t.docsTitle}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: BookOpenText, title: t.docsItem1Title, text: t.docsItem1Text },
              { icon: Code, title: t.docsItem2Title, text: t.docsItem2Text },
              { icon: Globe, title: t.docsItem3Title, text: t.docsItem3Text },
            ].map((item) => (
              <div key={item.title} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">{t.faqTitle}</h2>
          <div className="max-w-4xl mx-auto grid gap-4">
            {[
              { q: t.faqItem1Q, a: t.faqItem1A },
              { q: t.faqItem2Q, a: t.faqItem2A },
              { q: t.faqItem3Q, a: t.faqItem3A },
            ].map((item) => (
              <div key={item.q} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <CircleHelp className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">{item.q}</h3>
                    <p className="text-muted-foreground">{item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-4">{t.format}</h2>
          <div className="inline-block bg-card border border-border rounded-xl p-4 text-left font-mono text-sm">
            <p className="text-muted-foreground mb-2">{t.formatText}</p>
            <code className="text-primary">
              {origin}/proxy/
              <span className="text-foreground">example.com/video/123</span>
            </code>
          </div>
        </section>
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-muted-foreground text-sm">
          <p>{t.footer}</p>
        </div>
      </footer>
    </div>
  )
}
