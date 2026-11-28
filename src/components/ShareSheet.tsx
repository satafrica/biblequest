import { useEffect, useState } from 'react'
import { Copy, Download, Globe, Mail, MessageCircle, MessageSquare, Share2 } from 'lucide-react'
import { Modal } from './ui'
import { shareLinks, shareTarget, type ShareTarget } from '../lib/share'

/**
 * A share window: the phone's own share menu (when the browser has one), copy link,
 * WhatsApp, Facebook, email, text message, and a QR code to show on a screen or print.
 */
export function ShareSheet({ open, onClose, target, heading = 'Share MyBibleGem', qrName = 'mybiblegem-qr' }: { open: boolean; onClose: () => void; target: ShareTarget; heading?: string; qrName?: string }) {
  const [note, setNote] = useState('')
  const [qr, setQr] = useState('')
  const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const links = shareLinks(target)

  useEffect(() => {
    if (!open) return
    setNote('')
    let live = true
    import('qrcode').then((m) => m.toDataURL(target.url, { width: 480, margin: 2, color: { dark: '#142B40', light: '#FFFFFF' } }))
      .then((u) => { if (live) setQr(u) }, () => {})
    return () => { live = false }
  }, [open, target.url])

  const copy = async () => {
    try { await navigator.clipboard.writeText(target.url); setNote('Link copied. Paste it into a message, email or post.') }
    catch { setNote(`Copy this link: ${target.url}`) }
  }
  const native = async () => {
    const r = await shareTarget(target)
    if (r === 'copied') setNote('Message and link copied. Paste them anywhere.')
    else if (r === 'failed') setNote(`Copy this link: ${target.url}`)
  }
  const ext = { target: '_blank', rel: 'noreferrer' } as const

  return (
    <Modal open={open} onClose={onClose} title={heading}>
      <p className="text-sm text-muted">{target.text}</p>
      <p className="mt-2 break-all rounded-lg border border-line bg-raised px-3 py-2 font-mono text-sm" data-testid="share-url">{target.url}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {canNative && <button type="button" className="btn-primary btn-sm col-span-2" onClick={native}><Share2 className="h-4 w-4" aria-hidden="true" />Share…</button>}
        <button type="button" className={canNative ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'} onClick={copy}><Copy className="h-4 w-4" aria-hidden="true" />Copy link</button>
        <a className="btn-secondary btn-sm" href={links.whatsapp} {...ext}><MessageCircle className="h-4 w-4" aria-hidden="true" />WhatsApp</a>
        <a className="btn-secondary btn-sm" href={links.sms}><MessageSquare className="h-4 w-4" aria-hidden="true" />Text message</a>
        <a className="btn-secondary btn-sm" href={links.email}><Mail className="h-4 w-4" aria-hidden="true" />Email</a>
        <a className="btn-secondary btn-sm" href={links.facebook} {...ext}><Globe className="h-4 w-4" aria-hidden="true" />Facebook</a>
      </div>
      <p className="mt-3 min-h-5 text-sm text-good" role="status">{note}</p>
      <div className="mt-2 flex flex-col items-center gap-2 border-t border-line pt-4 text-center">
        {qr ? <img src={qr} alt={`QR code for ${target.url}`} className="h-36 w-36 rounded-lg border border-line bg-white" data-testid="share-qr" /> : <div className="h-36 w-36" />}
        <p className="text-xs text-muted">Scan with a phone camera to open. Show it on a screen or print it for your church or study group.</p>
        {qr && <a className="btn-ghost btn-sm" href={qr} download={`${qrName}.png`}><Download className="h-4 w-4" aria-hidden="true" />Download QR code</a>}
      </div>
    </Modal>
  )
}

/** A button that opens the share window. */
export function ShareButton({ target, label = 'Share MyBibleGem', heading, qrName, className = 'btn-secondary btn-sm', iconOnly = false }: { target: ShareTarget; label?: string; heading?: string; qrName?: string; className?: string; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={iconOnly ? label : undefined}>
        <Share2 className="h-4 w-4" aria-hidden="true" />{!iconOnly && label}
      </button>
      <ShareSheet open={open} onClose={() => setOpen(false)} target={target} heading={heading ?? label} qrName={qrName} />
    </>
  )
}
