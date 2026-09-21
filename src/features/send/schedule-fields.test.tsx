import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
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
})
