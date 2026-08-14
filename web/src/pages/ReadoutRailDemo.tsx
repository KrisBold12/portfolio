import Panel from '../components/Panel/Panel'
import ReadoutRail from '../components/ReadoutRail/ReadoutRail'

/**
 * TEMPORARY route, added for Task 2 ("Primitives and the ReadoutRail") to
 * satisfy its "done when": a route rendering a rail with a threshold, two
 * markers and both zone labels, correct at 360px and 1440px.
 *
 * Task 6 ("Responsive, accessibility and motion pass") removes this route
 * and this file once the real pages (Task 3, Task 5) exercise ReadoutRail
 * for real.
 */
function ReadoutRailDemo() {
  return (
    <main style={{ maxWidth: '1120px', margin: '0 auto', padding: 'var(--s5)', display: 'grid', gap: 'var(--s6)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h1)' }}>
        ReadoutRail demo (temporary — Task 2)
      </h1>

      <Panel label="Is it a dog — OOD gate">
        <ReadoutRail
          title="Distance to nearest breed"
          min={0}
          max={90}
          threshold={{ value: 49.27, label: 'threshold' }}
          zones={{ left: 'accepted', right: 'rejected' }}
          markers={[
            {
              value: 32.41,
              label: 'sample A',
              color: 'var(--signal)',
              caption: 'Accepted: 32.41 sits below the 49.27 threshold, so the gate treats this as a dog.',
            },
            {
              value: 63.8,
              label: 'sample B',
              color: 'var(--reject)',
              caption: 'Rejected: 63.8 sits above the 49.27 threshold, so the gate does not treat this as a dog.',
            },
          ]}
        />
      </Panel>

      <Panel label="Headline finding — accuracy by source">
        <ReadoutRail
          title="Top-1 accuracy, 21 shared breeds"
          min={70}
          max={100}
          unit="%"
          markers={[
            { value: 94.11, label: 'Stanford Dogs', color: 'var(--signal)' },
            { value: 87.87, label: 'Oxford-IIIT Pet', color: 'var(--probe)' },
          ]}
        />
      </Panel>

      <Panel label="Edge case — values near the axis ends">
        <ReadoutRail
          title="Edge-anchored labels"
          min={0}
          max={90}
          markers={[
            { value: 2, label: 'near min', color: 'var(--probe)' },
            { value: 88, label: 'near max', color: 'var(--signal)' },
          ]}
        />
      </Panel>
    </main>
  )
}

export default ReadoutRailDemo
