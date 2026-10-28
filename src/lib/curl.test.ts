import { describe, expect, it } from 'vitest'
import type { ApiRequest } from '@/api/request'
import { shellQuote, toCurl } from './curl'

const base = {
  baseUrl: 'http://localhost:3000',
  username: 'admin',
  password: 's3cr3t',
  deviceId: null,
  revealSecrets: true,
}

const textRequest: ApiRequest = {
  method: 'POST',
  path: '/send/message',
  json: { phone: '628123@s.whatsapp.net', message: 'hello' },
}

describe('shellQuote', () => {
  it('wraps a plain value in single quotes', () => {
    expect(shellQuote('hello')).toBe("'hello'")
  })

  it('escapes an embedded single quote', () => {
    expect(shellQuote("don't")).toBe("'don'\\''t'")
  })

  it('leaves double quotes and backslashes untouched', () => {
    expect(shellQuote('say "hi" \\ ok')).toBe('\'say "hi" \\ ok\'')
  })
})

describe('toCurl', () => {
  it('renders method, url, auth and a json body indented under -d', () => {
    expect(toCurl(textRequest, base)).toBe(
      [
        "curl -X POST 'http://localhost:3000/send/message' \\",
        "  -u 'admin:s3cr3t' \\",
        "  -H 'Content-Type: application/json' \\",
        "  -d '{",
        '    "phone": "628123@s.whatsapp.net",',
        '    "message": "hello"',
        "  }'",
      ].join('\n'),
    )
  })

  it('masks the password unless secrets are revealed', () => {
    const masked = toCurl(textRequest, { ...base, revealSecrets: false })
    expect(masked).toContain("-u 'admin:••••••••'")
    expect(masked).not.toContain('s3cr3t')
  })

  it('omits auth entirely when no credentials are configured', () => {
    const command = toCurl(textRequest, { ...base, username: null, password: null })
    expect(command).not.toContain('-u ')
  })

  it('includes the url-encoded device header when a device is selected', () => {
    expect(toCurl(textRequest, { ...base, deviceId: 'my device/1' })).toContain(
      "-H 'X-Device-Id: my%20device%2F1'",
    )
  })

  it('joins base url and path without doubling the slash', () => {
    expect(toCurl(textRequest, { ...base, baseUrl: 'http://localhost:3000/' })).toContain(
      "'http://localhost:3000/send/message'",
    )
  })

  it('escapes a body containing an apostrophe so the command stays runnable', () => {
    const request: ApiRequest = {
      method: 'POST',
      path: '/send/message',
      json: { message: "don't" },
    }
    expect(toCurl(request, base)).toContain('"message": "don\'\\\'\'t"')
  })

  it('renders multipart fields, using the filename for a file', () => {
    const request: ApiRequest = {
      method: 'POST',
      path: '/send/image',
      form: {
        phone: '628123@s.whatsapp.net',
        image: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
        compress: true,
      },
    }
    const command = toCurl(request, base)
    expect(command).toContain("--form-string 'phone=628123@s.whatsapp.net'")
    expect(command).toContain(`-F 'image=@"photo.jpg"'`)
    expect(command).toContain("--form-string 'compress=true'")
    expect(command).not.toContain('Content-Type: application/json')
  })

  it('sends scalar multipart values literally so a leading < is not a file read', () => {
    const request: ApiRequest = {
      method: 'POST',
      path: '/send/image',
      form: { caption: '<private.txt', phone: '@secret.txt' },
    }
    const command = toCurl(request, base)
    expect(command).toContain("--form-string 'caption=<private.txt'")
    expect(command).toContain("--form-string 'phone=@secret.txt'")
    expect(command).not.toContain("-F 'caption=")
    expect(command).not.toContain("-F 'phone=")
  })

  it('quotes file names that curl would otherwise treat as multipart syntax', () => {
    const request: ApiRequest = {
      method: 'POST',
      path: '/send/file',
      form: {
        file: new File(['x'], 'a,b;c".txt'),
        note: new File(['y'], "photo's.jpg"),
      },
    }
    const command = toCurl(request, base)
    expect(command).toContain(`-F 'file=@"a,b;c\\".txt"'`)
    expect(command).toContain(`-F 'note=@"photo'\\''s.jpg"'`)
  })

  it('keeps a line break in a file name so the copied command opens that file', () => {
    const request: ApiRequest = {
      method: 'POST',
      path: '/send/file',
      form: { file: new File(['x'], 'a\r\nb.txt') },
    }
    const command = toCurl(request, base)
    expect(command).toContain('file=@"a\r\nb.txt"')
    expect(command).not.toContain(String.raw`file=@"a\r\nb.txt"`)
  })

  it('repeats an array field once per item, matching what is sent', () => {
    const request: ApiRequest = {
      method: 'POST',
      path: '/send/image',
      form: { phone: '628123@s.whatsapp.net', weekdays: [1, 3] },
    }
    const command = toCurl(request, base)
    expect(command).toContain("--form-string 'weekdays=1'")
    expect(command).toContain("--form-string 'weekdays=3'")
    expect(command).not.toContain('weekdays=1,3')
  })

  it('skips empty and undefined multipart fields, matching what is sent', () => {
    const request: ApiRequest = {
      method: 'POST',
      path: '/send/image',
      form: { phone: '628123@s.whatsapp.net', caption: '', image_url: undefined },
    }
    const command = toCurl(request, base)
    expect(command).not.toContain('caption')
    expect(command).not.toContain('image_url')
  })
})
