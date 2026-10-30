import { AxiosError, type AxiosAdapter } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { exportParticipantsCsv } from '@/api/group'
import { http } from '@/lib/http'
import { useConnection } from '@/stores/connection'

describe('blob downloads', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    useConnection.setState({ baseUrl: null, connectionId: null, status: 'booting' })
  })

  function failWith(status: number, data: Blob): AxiosAdapter {
    return async (config) => {
      const response = { data, status, statusText: '', headers: {}, config }
      throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response)
    }
  }

  function connect() {
    useConnection.setState({ status: 'connected', baseUrl: 'https://a.example', connectionId: 'c' })
  }

  it("reports gowa's error envelope from a Blob body", async () => {
    const body = { code: 'INVALID_GROUP_ID', message: 'Group ID cannot be empty' }
    http.defaults.adapter = failWith(400, new Blob([JSON.stringify(body)]))
    connect()

    await expect(exportParticipantsCsv('')).rejects.toMatchObject({ status: 400, ...body })
  })

  it('keeps the status when the Blob body is not JSON', async () => {
    http.defaults.adapter = failWith(502, new Blob(['<html>bad gateway</html>']))
    connect()

    await expect(exportParticipantsCsv('g')).rejects.toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
    })
  })
})
