'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, X, Upload } from 'lucide-react'

export default function PhotoUpload({ inspectionId, sectionName, itemName, responseId, onUploaded }: any) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${inspectionId}/${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('inspection-photos')
      .upload(path, file, { upsert: false })

    if (uploadErr) {
      console.error(uploadErr)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('inspection-photos')
      .getPublicUrl(path)

    await supabase.from('inspection_photos').insert({
      inspection_id: inspectionId,
      response_id: responseId ?? null,
      storage_path: path,
      url: publicUrl,
      section_name: sectionName,
      item_name: itemName,
      label: `${sectionName} – ${itemName}`,
    })

    await supabase.from('audit_logs').insert({
      inspection_id: inspectionId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'photo_added',
      details: { section: sectionName, item: itemName },
    })

    setUploading(false)
    onUploaded?.()
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleUpload}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-navy border border-dashed border-gray-200 hover:border-navy rounded px-2 py-1 transition-all"
      >
        <Camera size={10} />
        {uploading ? 'Uploading…' : 'Photo'}
      </button>
    </>
  )
}
