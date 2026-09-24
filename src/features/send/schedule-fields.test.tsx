import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import type { AppInfo } from '@/api/types'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ScheduleFields } from '@/features/send/schedule-fields'
import { atTime, rezone } from '@/features/send/use-schedule-draft'

const noop = () => {}

/** Renders with `/app/info` already cached, the way the dashboard sees it once connected. */
function render(node: ReactNode, info: Partial<AppInfo> = { scheduled_sends: true }) {
  const client = new QueryClient()
  client.setQueryData(['app-info'], info)
  return renderToStaticMarkup(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('schedule panel', () => {
  it('renders nothing when the server does not advertise scheduled sends', () => {
    const html = render(
      <ScheduleFields
        draft={{ scheduled_at: '2030-01-01T09:00:00.000Z', timezone: 'UTC', recurrence: 'once' }}
        patch={noop}
      />,
      {},
    )
    expect(html).toBe('')
  })

  it('stays collapsed while the draft carries no scheduled time', () => {
    const html = render(
      <ScheduleFields draft={{ timezone: 'UTC', recurrence: 'once' }} patch={noop} />,
    )
    expect(html).toContain('Send later or repeat')
    expect(html).not.toContain('First send')
  })

  it('expands when the draft carries a scheduled time', () => {
    const html = render(
      <ScheduleFields
        draft={{ scheduled_at: '2030-01-01T09:00:00.000Z', timezone: 'UTC', recurrence: 'once' }}
        patch={noop}
      />,
    )
    expect(html).toContain('First send')
  })

  it('shows the scheduled time in the chosen timezone', () => {
    const html = render(
      <ScheduleFields
        draft={{
          scheduled_at: '2030-01-01T02:00:00.000Z',
          timezone: 'America/New_York',
          recurrence: 'once',
        }}
        patch={noop}
      />,
    )
    expect(html).toContain('value="21:00"')
  })

  it('hides the repeat limits for a one-time send', () => {
    const html = render(
      <ScheduleFields
        draft={{ scheduled_at: '2030-01-01T09:00:00.000Z', timezone: 'UTC', recurrence: 'once' }}
        patch={noop}
      />,
    )
    expect(html).not.toContain('Occurrences (optional)')
    expect(html).not.toContain('End date (optional)')
    expect(html).toContain('Timezone')
  })

  it('offers the repeat limits with an explanation once the send recurs', () => {
    const html = render(
      <TooltipProvider>
        <ScheduleFields
          draft={{ scheduled_at: '2030-01-01T09:00:00.000Z', timezone: 'UTC', recurrence: 'daily' }}
          patch={noop}
        />
      </TooltipProvider>,
    )
    expect(html).toContain('Occurrences (optional)')
    expect(html).toContain('End date (optional)')
    expect(html).toContain('What are occurrences?')
  })
})

describe('zoned schedule times', () => {
  it('reads a picked time in the chosen zone, whatever the browser zone', () => {
    const winter = new Date('2030-01-15T12:00:00.000Z')
    const summer = new Date('2030-07-15T12:00:00.000Z')
    expect(atTime(winter, 9, 0, 'America/New_York').toISOString()).toBe('2030-01-15T14:00:00.000Z')
    expect(atTime(summer, 9, 0, 'America/New_York').toISOString()).toBe('2030-07-15T13:00:00.000Z')
  })

  it('keeps the calendar day the zone shows, not the UTC one', () => {
    // 03:00Z on the 15th is still the evening of the 14th in New York.
    const day = new Date('2030-01-15T03:00:00.000Z')
    expect(atTime(day, 9, 0, 'America/New_York').toISOString()).toBe('2030-01-14T14:00:00.000Z')
  })

  it('keeps the wall-clock time when the timezone changes', () => {
    // 09:00 in Jakarta becomes 09:00 in New York.
    expect(rezone('2030-01-15T02:00:00.000Z', 'Asia/Jakarta', 'America/New_York')).toBe(
      '2030-01-15T14:00:00.000Z',
    )
    expect(rezone(undefined, 'Asia/Jakarta', 'America/New_York')).toBeUndefined()
  })
})
