import { useState, type FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  interactiveRequest,
  sendInteractive,
  type InteractiveButton,
  type InteractivePayload,
} from '@/api/send'
import { FormActions } from '@/components/shared/curl-dialog'
import { ResultPanel } from '@/components/shared/result-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'

type Mode = 'buttons' | 'location' | 'carousel'
type ButtonKind = 'quick_reply' | 'cta_url' | 'cta_copy' | 'cta_call' | 'single_select'

const MAX_BUTTONS = 10
const MAX_CARDS = 10
// The backend rejects carousel images over 2 MB decoded.
const MAX_CARD_IMAGE_BYTES = 2_000_000

const modeDescriptions: Record<Mode, string> = {
  buttons: 'Up to 10 reply, link, copy, call or list buttons under the text.',
  location: 'Asks the recipient to share their location.',
  carousel: '2–10 swipeable cards, each with an optional image and its own buttons.',
}

const kinds: Record<
  ButtonKind,
  { label: string; key: string; field: string; placeholder: string }
> = {
  quick_reply: { label: 'Quick reply', key: 'id', field: 'Reply ID', placeholder: 'confirm' },
  cta_url: { label: 'Open URL', key: 'url', field: 'URL', placeholder: 'https://example.com' },
  cta_copy: { label: 'Copy code', key: 'copy_code', field: 'Code', placeholder: 'PROMO2026' },
  cta_call: {
    label: 'Call',
    key: 'phone_number',
    field: 'Phone number',
    placeholder: '+15551234567',
  },
  single_select: { label: 'List', key: '', field: 'Section title', placeholder: 'Options' },
}

interface RowDraft {
  id: string
  title: string
  description: string
}

interface ButtonDraft {
  name: ButtonKind
  text: string
  /** id/url/copy_code/phone_number, or the section title of a list. */
  value: string
  rows: RowDraft[]
}

interface CardDraft {
  /** Stable React key: each card owns an uncontrolled file input. */
  key: number
  image?: string
  title: string
  body: string
  footer: string
  buttons: ButtonDraft[]
}

let nextCardKey = 0

const newRow = (): RowDraft => ({ id: '', title: '', description: '' })
const newButton = (): ButtonDraft => ({
  name: 'quick_reply',
  text: '',
  value: '',
  rows: [newRow()],
})
const newCard = (): CardDraft => ({
  key: nextCardKey++,
  title: '',
  body: '',
  footer: '',
  buttons: [newButton()],
})

function toButton(draft: ButtonDraft): InteractiveButton {
  if (draft.name === 'single_select') {
    return {
      name: draft.name,
      params: {
        title: draft.text,
        sections: [
          {
            title: draft.value || undefined,
            rows: draft.rows.map((row) => ({
              id: row.id,
              title: row.title,
              description: row.description || undefined,
            })),
          },
        ],
      },
    }
  }
  return {
    name: draft.name,
    params: { display_text: draft.text, [kinds[draft.name].key]: draft.value },
  }
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    // Strip the data-URL prefix: the backend wants raw base64.
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function update<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, i) => (i === index ? { ...item, ...patch } : item))
}

function ButtonsEditor({
  buttons,
  onChange,
}: {
  buttons: ButtonDraft[]
  onChange: (buttons: ButtonDraft[]) => void
}) {
  const set = (index: number, patch: Partial<ButtonDraft>) =>
    onChange(update(buttons, index, patch))

  return (
    <div className="flex flex-col gap-2">
      <Label>Buttons</Label>
      {buttons.map((button, index) => {
        const kind = kinds[button.name]
        const list = button.name === 'single_select'
        return (
          <div key={index} className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Select
                value={button.name}
                onValueChange={(name) => set(index, { name: name as ButtonKind, value: '' })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(kinds).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                aria-label={list ? 'List button text' : 'Button text'}
                placeholder={list ? 'List button text' : 'Button text'}
                value={button.text}
                onChange={(event) => set(index, { text: event.target.value })}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove button"
                onClick={() => onChange(buttons.filter((_, i) => i !== index))}
                disabled={buttons.length <= 1}
              >
                <X />
              </Button>
            </div>
            <Input
              aria-label={kind.field}
              placeholder={
                list ? `${kind.field} (optional)` : `${kind.field} — ${kind.placeholder}`
              }
              type={button.name === 'cta_url' ? 'url' : 'text'}
              value={button.value}
              onChange={(event) => set(index, { value: event.target.value })}
              required={!list}
            />
            {list && (
              <div className="flex flex-col gap-2">
                {button.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center gap-2">
                    <Input
                      aria-label="Row ID"
                      placeholder="Row ID"
                      className="w-28 font-mono"
                      value={row.id}
                      onChange={(event) =>
                        set(index, {
                          rows: update(button.rows, rowIndex, { id: event.target.value }),
                        })
                      }
                      required
                    />
                    <Input
                      aria-label="Row title"
                      placeholder="Title"
                      value={row.title}
                      onChange={(event) =>
                        set(index, {
                          rows: update(button.rows, rowIndex, { title: event.target.value }),
                        })
                      }
                      required
                    />
                    <Input
                      aria-label="Row description"
                      placeholder="Description (optional)"
                      value={row.description}
                      onChange={(event) =>
                        set(index, {
                          rows: update(button.rows, rowIndex, { description: event.target.value }),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove row"
                      onClick={() =>
                        set(index, { rows: button.rows.filter((_, i) => i !== rowIndex) })
                      }
                      disabled={button.rows.length <= 1}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => set(index, { rows: [...button.rows, newRow()] })}
                >
                  <Plus />
                  Add row
                </Button>
              </div>
            )}
          </div>
        )
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...buttons, newButton()])}
        disabled={buttons.length >= MAX_BUTTONS}
      >
        <Plus />
        Add button
      </Button>
    </div>
  )
}

function CardsEditor({
  cards,
  onChange,
}: {
  cards: CardDraft[]
  onChange: (cards: CardDraft[]) => void
}) {
  const set = (index: number, patch: Partial<CardDraft>) => onChange(update(cards, index, patch))

  const pickImage = async (index: number, file?: File) => {
    if (file && file.size > MAX_CARD_IMAGE_BYTES) {
      toast.error('Card images must be 2 MB or smaller')
      return
    }
    set(index, { image: file ? await readBase64(file) : undefined })
  }

  return (
    <div className="flex flex-col gap-3">
      {cards.map((card, index) => (
        <div key={card.key} className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Card {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove card"
              onClick={() => onChange(cards.filter((_, i) => i !== index))}
              disabled={cards.length <= 2}
            >
              <X />
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`card-${card.key}-image`}>Image (optional, JPEG/PNG up to 2 MB)</Label>
            <Input
              id={`card-${card.key}-image`}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(event) => void pickImage(index, event.target.files?.[0])}
            />
          </div>
          <Input
            aria-label="Card title"
            placeholder="Title (optional)"
            value={card.title}
            onChange={(event) => set(index, { title: event.target.value })}
          />
          <Textarea
            aria-label="Card body"
            placeholder="Body"
            rows={2}
            value={card.body}
            onChange={(event) => set(index, { body: event.target.value })}
            required
          />
          <Input
            aria-label="Card footer"
            placeholder="Footer (optional)"
            value={card.footer}
            onChange={(event) => set(index, { footer: event.target.value })}
          />
          <ButtonsEditor buttons={card.buttons} onChange={(buttons) => set(index, { buttons })} />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...cards, newCard()])}
        disabled={cards.length >= MAX_CARDS}
      >
        <Plus />
        Add card
      </Button>
    </div>
  )
}

export function SendInteractiveForm() {
  const jid = useRecipientJid()
  const [mode, setMode] = useState<Mode>('buttons')
  const [body, setBody] = useState('')
  const [footer, setFooter] = useState('')
  const [buttons, setButtons] = useState<ButtonDraft[]>(() => [newButton()])
  const [cards, setCards] = useState<CardDraft[]>(() => [newCard(), newCard()])

  const mutation = useActionMutation(sendInteractive, {
    successMessage: 'Interactive message sent',
    onSuccess: () => {
      setBody('')
      setFooter('')
      setButtons([newButton()])
      setCards([newCard(), newCard()])
    },
  })

  const payload: InteractivePayload = {
    phone: jid,
    body,
    footer: footer || undefined,
    buttons:
      mode === 'buttons'
        ? buttons.map(toButton)
        : mode === 'location'
          ? [{ name: 'send_location', params: {} }]
          : undefined,
    cards:
      mode === 'carousel'
        ? cards.map((card) => ({
            image_base64: card.image,
            title: card.title || undefined,
            body: card.body,
            footer: card.footer || undefined,
            buttons: card.buttons.map(toButton),
          }))
        : undefined,
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(payload)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <p className="text-muted-foreground text-xs">
        Experimental: sent immediately (no scheduling), and WhatsApp clients may not render every
        button type.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="interactive-mode">Style</Label>
        <Select value={mode} onValueChange={(value) => setMode(value as Mode)}>
          <SelectTrigger id="interactive-mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="buttons">Buttons</SelectItem>
            <SelectItem value="location">Location request</SelectItem>
            <SelectItem value="carousel">Image carousel</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">{modeDescriptions[mode]}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="interactive-body">Body</Label>
        <Textarea
          id="interactive-body"
          rows={3}
          maxLength={4096}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="interactive-footer">Footer (optional)</Label>
        <Input
          id="interactive-footer"
          maxLength={256}
          value={footer}
          onChange={(event) => setFooter(event.target.value)}
        />
      </div>
      {mode === 'buttons' && <ButtonsEditor buttons={buttons} onChange={setButtons} />}
      {mode === 'carousel' && <CardsEditor cards={cards} onChange={setCards} />}
      <FormActions
        submitLabel="Send interactive"
        pending={mutation.isPending}
        disabled={!jid}
        request={interactiveRequest(payload)}
      />
      <ResultPanel result={mutation.data} />
    </form>
  )
}
