'use client'

import { teamData, type TeamMember } from '@/data/site'
import MemberCard from './MemberCard'
import TeamModal from './TeamModal'
import Connector from './Connector'
import { motion, useReducedMotion } from 'motion/react'
import { useState, type ReactNode } from 'react'

/** Wraps a level so it fades/slides up as it scrolls into view (staggered). */
function Reveal({
  index,
  reduceMotion,
  children,
  className = '',
}: {
  index: number
  reduceMotion: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.5, delay: index * 0.08, ease: [0.22, 0.61, 0.36, 1] }
      }
    >
      {children}
    </motion.div>
  )
}

export default function OrgChart() {
  const reduceMotion = Boolean(useReducedMotion())
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

  const level1 = teamData.filter((m) => m.level === 1)
  const level2 = teamData.filter((m) => m.level === 2)
  const level3 = teamData.filter((m) => m.level === 3)

  return (
    <section className="py-16 sm:py-24" aria-labelledby="org-chart-heading">
      <h2 id="org-chart-heading" className="sr-only">
        CGS team organisation
      </h2>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Level 1: Founder / CEO */}
        <Reveal index={0} reduceMotion={reduceMotion} className="flex justify-center">
          {level1.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              showViewTeam={false}
            />
          ))}
        </Reveal>

        {/* Level 1 → 2 connector */}
        <Reveal index={1} reduceMotion={reduceMotion}>
          <Connector fromX={50} dropXs={[50]} accent treeAt="sm" />
        </Reveal>

        {/* Level 2: Deputy Lead */}
        <Reveal index={2} reduceMotion={reduceMotion} className="flex justify-center">
          {level2.map((member) => (
            <div key={member.id} className="flex justify-center px-3 sm:px-5">
              <MemberCard
                member={member}
                showViewTeam={false}
              />
            </div>
          ))}
        </Reveal>

        {level3.length > 0 && (
          <Reveal index={3} reduceMotion={reduceMotion} className="mt-10 grid grid-cols-1 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {level3.map((member) => (
              <div key={member.id} className="flex justify-center px-3 sm:px-3 lg:px-4">
                <MemberCard
                  member={member}
                  showViewTeam={Boolean(member.team?.length)}
                  onViewTeamClick={() => setSelectedMember(member)}
                />
              </div>
            ))}
          </Reveal>
        )}
      </div>

      {/* Team Modal */}
      {selectedMember && (
        <TeamModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </section>
  )
}

