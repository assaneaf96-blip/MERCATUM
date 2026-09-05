import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Aucun fichier sélectionné' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const uploadedItems: { url: string; type: 'image' | 'video'; name: string }[] = []

    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Sanitize file name
      const originalExt = path.extname(file.name) || ''
      const safeBase = path
        .basename(file.name, originalExt)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .substring(0, 30)

      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      const fileName = `${safeBase}-${uniqueId}${originalExt || '.jpg'}`
      const filePath = path.join(uploadDir, fileName)

      await writeFile(filePath, buffer)

      const isVideo =
        file.type.startsWith('video/') ||
        /\.(mp4|webm|mov|avi|m4v|ogg)$/i.test(fileName)

      uploadedItems.push({
        url: `/uploads/${fileName}`,
        type: isVideo ? 'video' : 'image',
        name: file.name,
      })
    }

    return NextResponse.json({ success: true, files: uploadedItems })
  } catch (error: any) {
    console.error('Erreur API upload:', error)
    return NextResponse.json(
      { error: error.message || "Erreur lors du téléversement des fichiers" },
      { status: 500 }
    )
  }
}
