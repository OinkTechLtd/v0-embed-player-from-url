import { Metadata } from "next"
import { ProxyPlayer } from "@/components/proxy-player"

interface ProxyPageProps {
  params: Promise<{ slug: string[] }>
}

export async function generateMetadata({ params }: ProxyPageProps): Promise<Metadata> {
  const { slug } = await params
  const url = slug.join('/')
  
  return {
    title: `Player - ${url}`,
    description: `Embedded video player from ${url}`,
  }
}

export default async function ProxyPage({ params }: ProxyPageProps) {
  const { slug } = await params
  const url = decodeURIComponent(slug.join('/'))
  
  return <ProxyPlayer url={url} />
}
