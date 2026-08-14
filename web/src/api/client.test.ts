import { afterEach, describe, expect, it, vi } from 'vitest'
import { predict, PredictError, type PredictResponse } from './client'

const dummyFile = new File(['data'], 'dog.jpg', { type: 'image/jpeg' })

function stubOkFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('predict', () => {
  it('returns the parsed body on a 200 response', async () => {
    const body: PredictResponse = {
      is_dog: true,
      predictions: [{ id: 'n02088364', name: 'beagle', probability: 0.92 }],
      ood: { distance: 12.4, threshold: 49.27 },
    }
    stubOkFetch(body, 200)

    await expect(predict(dummyFile)).resolves.toEqual(body)
  })

  it.each([
    [413, 'too-large'],
    [400, 'not-an-image'],
    [422, 'no-file'],
    [500, 'unavailable'],
    [503, 'unavailable'],
  ] as const)('maps HTTP %i to kind "%s"', async (status, kind) => {
    stubOkFetch({}, status)

    const error = await predict(dummyFile).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(PredictError)
    expect((error as PredictError).kind).toBe(kind)
    expect((error as PredictError).message.length).toBeGreaterThan(0)
  })

  it('maps a malformed JSON body on a 2xx response to "unavailable"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }),
    )

    const error = await predict(dummyFile).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(PredictError)
    expect((error as PredictError).kind).toBe('unavailable')
  })

  it('maps a network failure to "unavailable"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')))

    const error = await predict(dummyFile).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(PredictError)
    expect((error as PredictError).kind).toBe('unavailable')
  })

  it('posts a multipart form with a field named "file"', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ is_dog: true, predictions: [], ood: { distance: 0, threshold: 49.27 } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await predict(dummyFile)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/predict$/)
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('file')).toBe(dummyFile)
  })
})
