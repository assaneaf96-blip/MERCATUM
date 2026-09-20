'use client'

import React from 'react'

interface RichDescriptionProps {
  content: string
  className?: string
}

interface Segment {
  type: 'text' | 'image'
  text?: string
  src?: string
  alt?: string
}

export default function RichDescription({ content, className = '' }: RichDescriptionProps) {
  if (!content || !content.trim()) return null

  // Découpage du texte en segments (texte normal vs images Markdown ou balises HTML <img>)
  const segments: Segment[] = []
  const regex = /(!\[(.*?)\]\((.*?)\)|<img[^>]*src=["']([^"']+)["'][^>]*alt=["']?([^"'>]*)["']?[^>]*>)/gi
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    // Texte avant l'image
    if (match.index > lastIndex) {
      const textChunk = content.substring(lastIndex, match.index)
      if (textChunk.trim()) {
        segments.push({ type: 'text', text: textChunk })
      }
    }

    if (match[1].startsWith('![')) {
      // Markdown: ![alt](src)
      const alt = match[2]?.trim() || ''
      const src = match[3]?.trim() || ''
      if (src) {
        segments.push({ type: 'image', src, alt })
      }
    } else {
      // HTML <img src="..." alt="..." />
      const src = match[4]?.trim() || ''
      const alt = match[5]?.trim() || ''
      if (src) {
        segments.push({ type: 'image', src, alt })
      }
    }

    lastIndex = regex.lastIndex
  }

  // Reste du texte après la dernière image
  if (lastIndex < content.length) {
    const textChunk = content.substring(lastIndex)
    if (textChunk.trim()) {
      segments.push({ type: 'text', text: textChunk })
    }
  }

  // Si aucune image trouvée, affichage direct
  if (segments.length === 0) {
    return (
      <div className={`rich-description-text ${className}`} style={{ whiteSpace: 'pre-line', lineHeight: '1.75' }}>
        {content}
      </div>
    )
  }

  return (
    <div className={`rich-description space-y-4 ${className}`} style={{ lineHeight: '1.75' }}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return (
            <p
              key={idx}
              className="text-stone-700 whitespace-pre-line"
              style={{ lineHeight: '1.75' }}
            >
              {seg.text}
            </p>
          )
        }

        if (seg.type === 'image' && seg.src) {
          const hasCaption = seg.alt && !['photo', 'image', 'photo de présentation', 'sans titre'].includes(seg.alt.toLowerCase())
          return (
            <figure
              key={idx}
              className="my-4 mx-auto max-w-2xl overflow-hidden rounded-xl border border-stone-200 bg-[#faf8f3] shadow-sm"
            >
              <img
                src={seg.src}
                alt={seg.alt || 'Ilustración del producto MERCATUM'}
                className="w-full h-auto object-cover max-h-[500px] rounded-lg"
                loading="lazy"
              />
              {hasCaption && (
                <figcaption className="px-3 py-2 text-center text-xs text-stone-500 italic bg-[#f7f5ef] border-t border-stone-200">
                  {seg.alt}
                </figcaption>
              )}
            </figure>
          )
        }

        return null
      })}
    </div>
  )
}
