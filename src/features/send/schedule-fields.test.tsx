import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ScheduleFields } from '@/features/send/schedule-fields'

const noop = () => {}

describe('schedule panel', () => {
  it('stays collapsed while the draft carries no scheduled time', () => {
    const html = renderToStaticMarkup(
      <ScheduleFields draft={{ timezone: 'UTC', recurrence: 'once' }} patch={noop} />,
    )
    expect(html).not.toContain('First send')
  })

  it('expands when the draft carries a scheduled time', () => {
    const html = renderToStaticMarkup(
      <ScheduleFields
        draft={{ scheduled_at: '2030-01-01T09:00:00.000Z', timezone: 'UTC', recurrence: 'once' }}
        patch={noop}
      />,
    )
    expect(html).toContain('First send')
  })

  it('hides the repeat limits for a one-time send', () => {
    const html = renderToStaticMarkup(
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
    const html = renderToStaticMarkup(
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
