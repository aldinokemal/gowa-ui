import { useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface FileOrUrl {
  file?: File
  url: string
}

export function FileOrUrlInput({
  label,
  accept,
  value,
  onChange,
}: {
  label: string
  accept?: string
  value: FileOrUrl
  onChange: (value: FileOrUrl) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)

  // The file picker is uncontrolled, so clearing the selection in state has to
  // be mirrored onto the element or it keeps showing the old filename.
  useEffect(() => {
    if (!value.file && fileInput.current) fileInput.current.value = ''
  }, [value.file])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label>{label} — upload</Label>
        <Input
          ref={fileInput}
          type="file"
          accept={accept}
          onChange={(event) => onChange({ ...value, file: event.target.files?.[0] })}
        />
        {value.file && <p className="text-muted-foreground text-xs">{value.file.name}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label>…or {label.toLowerCase()} URL</Label>
        <Input
          placeholder="https://example.com/media"
          value={value.url}
          onChange={(event) => onChange({ ...value, url: event.target.value })}
        />
      </div>
    </div>
  )
}
