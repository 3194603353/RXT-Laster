import axios, { AxiosError } from 'axios'

export const ASSET_BASE: string =
   'http://101.37.83.215'

export const assetApi = axios.create({
  baseURL: ASSET_BASE,
  // 仅静态资源与上传，无需携带凭据
  withCredentials: false,
})

export type AssetType = 'image' | 'avatar'

export async function uploadAsset(type: AssetType, file: File): Promise<{ fileName: string; url: string }>{
  const form = new FormData()
  form.append('type', type)
  form.append('file', file)

  // 首次尝试（可能是 80 端口反代）
  try {
    const res = await assetApi.post('/api/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const data = res?.data || {}
    if (data && data.success && data.fileName && data.url) {
      return { fileName: data.fileName, url: data.url }
    }
    throw new Error(data?.message || '上传失败')
  } catch (err) {
    // 如果是网络层报错且当前 BASE 没显式端口，自动退回尝试 3000 端口一次
    const isNetwork = (err as AxiosError)?.message === 'Network Error'
    const hasPort = /:\d+$/.test(ASSET_BASE.replace(/https?:\/\//, ''))
    if (isNetwork && !hasPort) {
      const fallbackBase = ASSET_BASE.replace(/\/$/, '') + ':3000'
      try {
        const api2 = axios.create({ baseURL: fallbackBase })
        const res2 = await api2.post('/api/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const data2 = res2?.data || {}
        if (data2 && data2.success && data2.fileName && data2.url) {
          return { fileName: data2.fileName, url: data2.url }
        }
        throw new Error(data2?.message || '上传失败')
      } catch (err2) {
        throw wrapAxiosError(err2)
      }
    }
    throw wrapAxiosError(err)
  }
}

function wrapAxiosError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'object' && err) {
    try {
      const anyErr: any = err
      const status = anyErr?.response?.status
      const dataMsg = anyErr?.response?.data?.message || anyErr?.response?.data?.msg
      if (status || dataMsg) return new Error(`[${status || '网络'}] ${dataMsg || anyErr.message || '上传失败'}`)
    } catch {}
  }
  return new Error('网络错误或服务器无响应')
}

export function assetImageUrl(name?: string | null): string {
  if (!name) return `${ASSET_BASE}/favicon.ico`
  return `${ASSET_BASE}/image/${name}`
}

export function assetAvatarUrl(name?: string | null): string {
  const filename = (name && String(name).trim()) || 'default.jpg'
  return `${ASSET_BASE}/avatar/${filename}`
}
