'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, ExternalLink, MessageCircle, Send, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { org } from '@/data/site'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  handoff?: boolean
}

type AssistantResponse = {
  error?: string
  handoff?: boolean
  reply?: string
}

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi, I’m the CGS assistant. Ask me about the society, its programs, or this website. For urgent or sensitive matters, use the human support link below.',
}

const humanSupportHref = `https://wa.me/${org.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hello CGS, I would like to speak with a team member.')}`

export default function CgsAssistant() {
  const pathname = usePathname()
  const reduceMotion = Boolean(useReducedMotion())
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const endOfMessagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [isOpen, isSending, messages])

  if (pathname === '/attendance') return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || isSending) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setDraft('')
    setError('')
    setIsSending(true)

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => message.id !== 'welcome')
            .slice(-8)
            .map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        }),
      })
      const data = (await response.json().catch(() => ({}))) as AssistantResponse
      if (!response.ok || !data.reply) {
        throw new Error(data.error || 'The CGS assistant is unavailable right now.')
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.reply as string,
          handoff: data.handoff,
        },
      ])
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'The assistant is unavailable right now. A CGS team member can help on WhatsApp.',
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-100 flex flex-col items-end gap-3">
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.section
            key="cgs-assistant-panel"
            id="cgs-assistant-panel"
            aria-labelledby="cgs-assistant-title"
            initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 14, scale: 0.97 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 360, damping: 32, mass: 0.8 }
            }
            className="flex w-[calc(100vw-2.5rem)] max-w-95 flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-panel"
            style={{ maxHeight: 'min(78vh, 620px)', transformOrigin: 'bottom right' }}
          >
          <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-on-mint">
                <Bot size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="cgs-assistant-title" className="truncate text-sm font-semibold">
                  CGS Assistant
                </h2>
                <p className="text-xs text-ink-muted">Website and society support</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close CGS assistant"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X size={18} />
            </button>
          </header>

          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            className="flex min-h-45 flex-1 flex-col gap-3 overflow-y-auto bg-bg/50 px-4 py-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] whitespace-pre-wrap wrap-break-word rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${
                  message.role === 'user'
                    ? 'self-end rounded-br-md bg-mint text-on-mint'
                    : 'self-start rounded-bl-md border border-line bg-surface text-ink'
                }`}
              >
                {message.content}
                {message.handoff ? (
                  <a
                    href={humanSupportHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 font-semibold text-mint underline underline-offset-4"
                  >
                    Connect with a CGS person <ExternalLink size={14} aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            ))}
            {isSending ? (
              <p className="self-start rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-muted">
                CGS Assistant is replying…
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="self-start max-w-[88%] text-sm text-error">
                {error}
              </p>
            ) : null}
            <div ref={endOfMessagesRef} />
          </div>

          <div className="border-t border-line bg-surface px-4 py-3">
            <a
              href={humanSupportHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-mint hover:underline"
            >
              <MessageCircle size={15} aria-hidden="true" />
              Talk to a CGS person on WhatsApp
              <ExternalLink size={13} aria-hidden="true" />
            </a>
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <label className="sr-only" htmlFor="cgs-assistant-message">
                Message the CGS assistant
              </label>
              <input
                id="cgs-assistant-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={1200}
                placeholder="Ask about CGS…"
                className="field min-w-0 flex-1"
                disabled={isSending}
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={isSending || !draft.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-mint text-on-mint transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={16} aria-hidden="true" />
              </button>
            </form>
            <p className="mt-2 text-[11px] leading-4 text-ink-muted">
              Messages are processed by our AI provider. Don’t share passwords, API keys, or private incident details.
            </p>
          </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close CGS assistant' : 'Open CGS assistant'}
        aria-expanded={isOpen}
        aria-controls="cgs-assistant-panel"
        whileHover={reduceMotion ? undefined : { scale: 1.04 }}
        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 420, damping: 24, mass: 0.5 }
        }
        className="grid h-14 w-14 place-items-center rounded-full border border-line bg-mint text-on-mint shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isOpen ? 'close-icon' : 'open-icon'}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.72, rotate: isOpen ? -75 : 75 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.72, rotate: isOpen ? 75 : -75 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 420, damping: 26, mass: 0.55 }
            }
            className="inline-flex"
          >
            {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  )
}