type IconProps = { size?: number; className?: string }

/**
 * Brand marks for the CGS channels. lucide dropped its brand icon set in v1, so
 * these few paths live here as plain SVG.
 */
export function LinkedInIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C21.6 8.65 22 11.1 22 14.2V21h-4v-6.05c0-1.44-.03-3.3-2.01-3.3-2.02 0-2.33 1.57-2.33 3.19V21h-4V9Z" />
    </svg>
  )
}

export function InstagramIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function WhatsAppIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.81c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.81.84-3.04-.2-.31a8.17 8.17 0 0 1-1.25-4.37c0-4.54 3.7-8.24 8.23-8.24Zm-2.6 4.2c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02 0 1.19.87 2.34.99 2.5.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.43-.59 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.03-.38-1.96-1.21-.72-.65-1.21-1.45-1.35-1.69-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.45-.39-.39-.53-.4l-.45-.01Z" />
    </svg>
  )
}

export function DiscordIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.54 5.34A16.1 16.1 0 0 0 15.44 4c-.2.35-.42.83-.58 1.2a14.9 14.9 0 0 0-4.72 0c-.16-.38-.39-.85-.59-1.2a16 16 0 0 0-4.1 1.34C2.9 9.14 2.2 12.83 2.54 16.47a16.2 16.2 0 0 0 4.89 2.47c.4-.54.75-1.12 1.05-1.73a10.8 10.8 0 0 1-1.66-.8l.4-.32c3.2 1.48 6.66 1.48 9.82 0l.41.32c-.53.31-1.09.58-1.66.8.3.61.65 1.19 1.05 1.73a16.1 16.1 0 0 0 4.88-2.47c.4-4.22-.75-7.86-2.7-11.13ZM9.7 14.2c-.94 0-1.72-.87-1.72-1.94s.76-1.94 1.72-1.94 1.74.88 1.72 1.94c0 1.07-.76 1.94-1.72 1.94Zm6 0c-.94 0-1.72-.87-1.72-1.94s.76-1.94 1.72-1.94 1.74.88 1.72 1.94c0 1.07-.75 1.94-1.72 1.94Z" />
    </svg>
  )
}

export function YouTubeIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42a2.5 2.5 0 0 0-1.76 1.77A26.1 26.1 0 0 0 2 12a26.1 26.1 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77A26.1 26.1 0 0 0 22 12a26.1 26.1 0 0 0-.42-4.81ZM10 15.02V8.98L15.2 12 10 15.02Z" />
    </svg>
  )
}

export function GitHubIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  )
}

/** Social links use the active theme accent instead of platform brand colors. */
export const socialBrandColors = {
  linkedin: 'var(--mint)',
  instagram: 'var(--mint)',
  whatsapp: 'var(--mint)',
  discord: 'var(--mint)',
  youtube: 'var(--mint)',
  github: 'var(--mint)',
} as const satisfies Record<string, string>

export type SocialIconKey = keyof typeof socialBrandColors

export const socialIconMap: Record<SocialIconKey, (props: IconProps) => React.ReactElement> = {
  linkedin: LinkedInIcon,
  instagram: InstagramIcon,
  whatsapp: WhatsAppIcon,
  discord: DiscordIcon,
  youtube: YouTubeIcon,
  github: GitHubIcon,
}