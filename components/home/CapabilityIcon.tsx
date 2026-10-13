import { Flag, Network, ScanSearch, ShieldCheck, Users, Wrench } from 'lucide-react'
import type { ComponentType } from 'react'

const icons: Record<string, ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  flag: Flag,
  shield: ShieldCheck,
  scan: ScanSearch,
  wrench: Wrench,
  users: Users,
  network: Network,
}

/** Icon for a capability tile. Purely descriptive, so it is hidden from AT. */
export default function CapabilityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Flag
  return <Icon size={24} strokeWidth={1.75} className={className} aria-hidden="true" />
}
