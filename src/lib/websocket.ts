import { env } from '@/lib/env'
import type { WsEvent } from '@/types/websocket'

/**
 * Client WebSocket untuk event real-time (ARCHITECTURE.md §4.3).
 *
 * Ditulis sebagai class dengan satu instance bersama (bukan hook), karena
 * koneksi WebSocket harus hidup lebih lama daripada komponen mana pun. Kalau
 * koneksinya dimiliki sebuah komponen, berpindah halaman akan memutus dan
 * menyambung ulang socket setiap kali — dan setiap sambungan baru berarti satu
 * handshake plus verifikasi JWT di backend.
 *
 * API browser yang dipakai adalah WebSocket bawaan, tanpa library (PRD.md §3).
 */

type Listener = (event: WsEvent) => void

/** Jeda reconnect: naik bertahap, berhenti di 30 detik. */
const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10_000, 30_000]

class RealtimeClient {
  private socket: WebSocket | null = null
  private token: string | null = null
  private listeners = new Set<Listener>()
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  /** Membedakan "koneksi putus" dari "kita memang sengaja menutupnya". */
  private intentionallyClosed = false

  /**
   * Menyambung dengan access token. Aman dipanggil berkali-kali: kalau token
   * yang sama sudah tersambung, tidak terjadi apa-apa.
   */
  connect(token: string): void {
    if (this.socket && this.token === token) {
      const { readyState } = this.socket
      if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) return
    }

    this.disconnect()
    this.token = token
    this.intentionallyClosed = false
    this.open()
  }

  private open(): void {
    if (!this.token) return

    // Token dikirim lewat query param, bukan header Authorization. Ini bukan
    // pilihan gaya: API WebSocket di browser TIDAK menyediakan cara mengirim
    // header kustom saat handshake. Backend sudah menyiapkan jalur ini lewat
    // ProtectedAllowQueryToken() khusus untuk /ws.
    const url = `${env.VITE_WS_URL}?token=${encodeURIComponent(this.token)}`

    let socket: WebSocket
    try {
      socket = new WebSocket(url)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.socket = socket

    socket.onmessage = (message: MessageEvent<string>) => {
      let event: WsEvent
      try {
        event = JSON.parse(message.data) as WsEvent
      } catch {
        // Pesan yang tidak bisa diurai dibuang diam-diam. Menjatuhkan aplikasi
        // karena satu frame rusak jelas bukan trade-off yang benar.
        return
      }

      // Salin ke array dulu supaya listener yang meng-unsubscribe dirinya
      // sendiri saat dipanggil tidak mengubah Set yang sedang diiterasi.
      for (const listener of [...this.listeners]) {
        listener(event)
      }
    }

    socket.onopen = () => {
      // Reset hitungan supaya putus berikutnya kembali mencoba cepat.
      this.reconnectAttempt = 0
    }

    socket.onclose = () => {
      this.socket = null
      if (!this.intentionallyClosed) this.scheduleReconnect()
    }

    socket.onerror = () => {
      // Tidak perlu tindakan di sini: setiap error pada WebSocket selalu
      // disusul event close, dan di sanalah reconnect ditangani.
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return

    const delay =
      RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)] ?? 30_000
    this.reconnectAttempt += 1

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.open()
    }, delay)
  }

  disconnect(): void {
    this.intentionallyClosed = true

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.socket) {
      // Handler dilepas sebelum close() supaya onclose tidak menjadwalkan
      // reconnect untuk koneksi yang memang sengaja kita tutup.
      this.socket.onclose = null
      this.socket.onmessage = null
      this.socket.onerror = null
      this.socket.onopen = null
      this.socket.close()
      this.socket = null
    }

    this.token = null
    this.reconnectAttempt = 0
  }

  /** Mengirim event ke server. Diabaikan kalau socket belum siap. */
  send(event: { type: string; payload?: unknown }): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return
    this.socket.send(JSON.stringify(event))
  }

  /**
   * Mendaftarkan listener, mengembalikan fungsi untuk berhenti mendengarkan.
   *
   * Bentuk "subscribe mengembalikan unsubscribe" ini cocok betul dengan
   * cleanup useEffect: `return wsClient.subscribe(handler)` sudah cukup.
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

export const wsClient = new RealtimeClient()
