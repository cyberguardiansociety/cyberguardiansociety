interface ConnectorProps {
  /** Horizontal position (in %) of the parent card this connector drops from. */
  fromX: number
  /** Horizontal positions (in %) of each child card the connector feeds. */
  dropXs: number[]
  /** Use the accent colour for this connector (the Level 1 → 2 link). */
  accent?: boolean
  /**
   * Breakpoint at which the full tree is drawn. Below it, a single centred
   * vertical rail is shown instead, so lines never overlap stacked cards.
   * `sm` matches a 2-column level; `lg` matches a 3-column level.
   */
  treeAt?: 'sm' | 'lg'
}

const BAR_Y = 34 // px from the top of the connector where the horizontal bar sits
const HEIGHT = 68 // total connector height in px

/**
 * Draws the lines between two org-chart levels.
 *
 * Positions are percentages of the connector width, which equals the chart
 * container width — the same width the level grids use. Because each level is
 * an equal-column CSS grid (spacing comes from cell padding, not column gaps),
 * the child centres land exactly on these percentages, so the lines stay
 * aligned at every viewport width.
 */
export default function Connector({ fromX, dropXs, accent = false, treeAt = 'sm' }: ConnectorProps) {
  const allX = [fromX, ...dropXs]
  const minX = Math.min(...allX)
  const maxX = Math.max(...allX)
  const bar = accent ? 'bg-mint/70' : 'bg-line/60'

  // Show the full tree only from `treeAt` up; below it, show the vertical rail.
  const treeVisible = treeAt === 'lg' ? 'hidden lg:block' : 'hidden sm:block'
  const railVisible = treeAt === 'lg' ? 'lg:hidden' : 'sm:hidden'

  return (
    <div className="relative h-[68px] w-full" aria-hidden="true">
      {/* Simplified vertical rail (mobile / tablet) */}
      <div
        className={`absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rounded-full ${bar} ${railVisible}`}
      />

      {/* Full tree */}
      {/* Vertical line down from the parent card to the horizontal bar */}
      <div
        className={`absolute w-[2px] rounded-full ${treeVisible} ${bar}`}
        style={{ left: `${fromX}%`, top: 0, height: BAR_Y, transform: 'translateX(-50%)' }}
      />
      {/* Horizontal bar spanning from the left-most to the right-most anchor */}
      <div
        className={`absolute h-[2px] rounded-full ${treeVisible} ${bar}`}
        style={{ left: `${minX}%`, top: BAR_Y, width: `${maxX - minX}%` }}
      />
      {/* Vertical drops into each child card */}
      {dropXs.map((x, i) => (
        <div
          key={i}
          className={`absolute bottom-0 w-[2px] rounded-full ${treeVisible} ${bar}`}
          style={{ left: `${x}%`, height: HEIGHT - BAR_Y, transform: 'translateX(-50%)' }}
        />
      ))}
    </div>
  )
}

