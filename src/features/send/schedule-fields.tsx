import { useMemo, useState } from 'react'
import { TZDate } from '@date-fns/tz'
import { CalendarIcon, ChevronsUpDownIcon, InfoIcon, XIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ScheduleFields } from '@/api/send'
import {
  atTime,
  browserTimezone,
  nextMinute,
  parseIso,
  rezone,
} from '@/features/send/use-schedule-draft'
import { useAppInfo } from '@/hooks/use-app-info'

export type ScheduleDraft = ScheduleFields

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ALL_WEEKDAYS = WEEKDAYS.map((_, day) => day)

/** How far ahead the year dropdown reaches; react-day-picker stops at the current year without it. */
const SCHEDULE_YEARS_AHEAD = 5

/** `HH:mm` of a zoned date, matching what the date button shows. */
function toTimeInput(date: TZDate | undefined) {
  if (!date) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function isSameDay(a: TZDate, b: TZDate) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function timezoneOptions(current: string) {
  const zones =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return zones.includes(current) ? zones : [current, ...zones]
}

function DateTimeField({
  id,
  label,
  value,
  onChange,
  min,
  timeZone,
  required,
}: {
  id: string
  label: string
  value: string | undefined
  onChange: (iso: string | undefined) => void
  /** Earliest allowed instant; a schedule can never point into the past. */
  min: Date
  /** The IANA zone the date and time are read and written in. */
  timeZone: string
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const parsed = parseIso(value)
  const selected = parsed && new TZDate(parsed, timeZone)
  const zonedMin = new TZDate(min, timeZone)

  const pickDay = (day: Date) => {
    const next = atTime(day, selected?.getHours() ?? 9, selected?.getMinutes() ?? 0, timeZone)
    onChange((next <= min ? nextMinute(min) : next).toISOString())
    setOpen(false)
  }

  const pickTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return
    onChange(atTime(selected ?? zonedMin, hours, minutes, timeZone).toISOString())
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex max-w-xs gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              data-empty={!selected}
              className="data-[empty=true]:text-muted-foreground min-w-0 flex-1 justify-between font-normal"
            >
              <CalendarIcon data-icon="inline-start" />
              <span className="flex-1 truncate text-left">
                {selected
                  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone }).format(
                      selected,
                    )
                  : 'Select date'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected ?? zonedMin}
              captionLayout="dropdown"
              timeZone={timeZone}
              startMonth={zonedMin}
              endMonth={new TZDate(zonedMin.getFullYear() + SCHEDULE_YEARS_AHEAD, 11, 31, timeZone)}
              disabled={{ before: zonedMin }}
              onSelect={(day) => day && pickDay(day)}
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          aria-label={`${label} time`}
          value={toTimeInput(selected)}
          onChange={(event) => pickTime(event.target.value)}
          disabled={!selected}
          required={required}
          min={selected && isSameDay(selected, zonedMin) ? toTimeInput(zonedMin) : undefined}
          className="w-24 shrink-0 appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
        />
        {!required && selected && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => onChange(undefined)}
          >
            <XIcon />
          </Button>
        )}
      </div>
    </div>
  )
}

function TimezoneField({ value, onChange }: { value: string; onChange: (zone: string) => void }) {
  const [open, setOpen] = useState(false)
  const zones = useMemo(() => timezoneOptions(value), [value])

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="schedule-timezone">Timezone</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="schedule-timezone"
            type="button"
            role="combobox"
            variant="outline"
            className="justify-between font-normal"
          >
            <span className="truncate">{value}</span>
            <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command defaultValue={value}>
            <CommandInput placeholder="Search timezone..." />
            <CommandList>
              <CommandEmpty>No timezone found.</CommandEmpty>
              <CommandGroup>
                {zones.map((zone) => (
                  <CommandItem
                    key={zone}
                    value={zone}
                    data-checked={zone === value}
                    onSelect={() => {
                      onChange(zone)
                      setOpen(false)
                    }}
                  >
                    {zone}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function ScheduleFields({
  draft,
  patch,
}: {
  draft: ScheduleDraft
  patch: (change: Partial<ScheduleDraft>) => void
}) {
  const { data: info } = useAppInfo()
  /** Derived so clearing the draft — after a send — also collapses the panel. */
  const enabled = Boolean(draft.scheduled_at)
  const localTimezone = useMemo(() => draft.timezone || browserTimezone(), [draft.timezone])
  const recurrence = draft.recurrence || 'once'
  const now = new Date()
  const firstSend = parseIso(draft.scheduled_at)

  // Servers without the scheduler never see the panel, so the draft never gains scheduled_at.
  if (!info?.scheduled_sends) return null

  const enable = (value: boolean) => {
    if (value) {
      const initial = new Date(Date.now() + 10 * 60_000)
      patch({ scheduled_at: initial.toISOString(), timezone: localTimezone })
    } else {
      // Back to an empty draft, keeping only the chosen timezone.
      patch({
        scheduled_at: undefined,
        recurrence: 'once',
        weekdays: undefined,
        day_of_month: undefined,
        end_at: undefined,
        occurrence_limit: undefined,
      })
    }
  }

  /** A user who picked 09:00 still means 09:00 after switching zones. */
  const changeTimezone = (zone: string) => {
    const scheduledAt = rezone(draft.scheduled_at, localTimezone, zone)
    patch({
      timezone: zone,
      // The same wall clock in a zone further east can already be past.
      scheduled_at:
        scheduledAt && new Date(scheduledAt) <= now ? nextMinute(now).toISOString() : scheduledAt,
      end_at: rezone(draft.end_at, localTimezone, zone),
    })
  }

  const changeRecurrence = (value: ScheduleDraft['recurrence']) => {
    patch({
      recurrence: value,
      weekdays: value === 'weekly' ? draft.weekdays : undefined,
      day_of_month: value === 'monthly' ? draft.day_of_month : undefined,
      end_at: value === 'once' ? undefined : draft.end_at,
      occurrence_limit: value === 'once' ? undefined : draft.occurrence_limit,
    })
  }

  /**
   * Daily is every weekday, so it shows all seven chips lit. Dropping one falls
   * back to weekly, and lighting the seventh climbs back to daily; the wire
   * payload still sends no weekdays for daily.
   */
  const selectedWeekdays = recurrence === 'daily' ? ALL_WEEKDAYS : (draft.weekdays ?? [])

  const changeWeekdays = (values: string[]) => {
    const days = values.map(Number).sort((a, b) => a - b)
    if (days.length === ALL_WEEKDAYS.length) patch({ recurrence: 'daily', weekdays: undefined })
    else patch({ recurrence: 'weekly', weekdays: days })
  }

  return (
    <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="schedule-enabled"
          checked={enabled}
          onCheckedChange={(checked) => enable(checked === true)}
        />
        <Label htmlFor="schedule-enabled" className="font-medium">
          Send later or repeat
        </Label>
      </div>
      {enabled && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <DateTimeField
              id="schedule-at"
              label="First send"
              value={draft.scheduled_at}
              onChange={(iso) =>
                patch({
                  scheduled_at: iso,
                  // An end no longer after the first send would be rejected; drop it.
                  end_at:
                    iso && draft.end_at && new Date(draft.end_at) <= new Date(iso)
                      ? undefined
                      : draft.end_at,
                })
              }
              min={now}
              timeZone={localTimezone}
              required
            />
            <div className="flex flex-col gap-2">
              <Label>Recurrence</Label>
              <Select
                value={recurrence}
                onValueChange={(value) => changeRecurrence(value as ScheduleFields['recurrence'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(recurrence === 'daily' || recurrence === 'weekly') && (
            <div className="flex flex-col gap-2">
              <Label>Weekdays</Label>
              <ToggleGroup
                type="multiple"
                variant="outline"
                size="sm"
                value={selectedWeekdays.map(String)}
                onValueChange={changeWeekdays}
              >
                {WEEKDAYS.map((label, day) => (
                  <ToggleGroupItem key={label} value={String(day)}>
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}
          {recurrence === 'monthly' && (
            <div className="flex flex-col gap-2 sm:max-w-xs">
              <Label htmlFor="schedule-day">Day of month</Label>
              <Input
                id="schedule-day"
                type="number"
                min={1}
                max={31}
                value={draft.day_of_month ?? ''}
                onChange={(event) =>
                  patch({ day_of_month: Number(event.target.value) || undefined })
                }
                required
              />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recurrence !== 'once' && (
              <>
                <DateTimeField
                  id="schedule-end"
                  label="End date (optional)"
                  value={draft.end_at}
                  onChange={(iso) => patch({ end_at: iso })}
                  min={firstSend && firstSend > now ? firstSend : now}
                  timeZone={localTimezone}
                />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="schedule-count">Occurrences (optional)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="What are occurrences?"
                          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-3"
                        >
                          <InfoIcon className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Stop the schedule after this many sends. Leave it empty to keep repeating
                        until the end date, or until you pause it.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="schedule-count"
                    type="number"
                    min={1}
                    value={draft.occurrence_limit ?? ''}
                    onChange={(event) =>
                      patch({ occurrence_limit: Number(event.target.value) || undefined })
                    }
                  />
                </div>
              </>
            )}
            <TimezoneField value={localTimezone} onChange={changeTimezone} />
          </div>
          <p className="text-muted-foreground text-xs">
            Times use {localTimezone}. Uploaded media is stored on the server for delayed delivery.
          </p>
        </>
      )}
    </div>
  )
}
