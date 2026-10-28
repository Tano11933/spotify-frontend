import { AxiosError, type AxiosProgressEvent, type AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { adminApi, api, getApiErrorMessage } from './api'
import { makeSong } from '@/test/player'

afterEach(() => vi.restoreAllMocks())

describe('multipart audio client', () => {
  it('preserves browser boundary generation, abort signal and progress', async () => {
    const song = makeSong(3)
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: song } as AxiosResponse)
    const file = new File(['fixture'], 'audio.wav')
    const controller = new AbortController()
    const onProgress = vi.fn()
    expect(await adminApi.uploadAudio(3, file, { signal: controller.signal, onProgress })).toEqual(song)
    const [path, body, config] = post.mock.calls[0]!
    expect(path).toBe('/admin/songs/3/audio')
    expect((body as FormData).get('file')).toBe(file)
    expect(config?.headers?.['Content-Type']).toBeUndefined()
    expect(config?.signal).toBe(controller.signal)
    expect(config?.timeout).toBe(120_000)
    config?.onUploadProgress?.({ loaded: 20, total: 80 } as AxiosProgressEvent)
    expect(onProgress).toHaveBeenLastCalledWith(25)
    config?.onUploadProgress?.({ loaded: 20 } as AxiosProgressEvent)
    expect(onProgress).toHaveBeenLastCalledWith(null)
  })

  it('retains the structured backend error response', async () => {
    const cause = new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined,
      { status: 400, data: { code: 'validation_error', error: 'invalid audio content' } } as AxiosResponse)
    vi.spyOn(api, 'post').mockRejectedValue(cause)
    await expect(adminApi.uploadAudio(2, new File(['bad'], 'fake.mp3'))).rejects.toBe(cause)
    expect(getApiErrorMessage(cause)).toBe('invalid audio content')
  })
})
