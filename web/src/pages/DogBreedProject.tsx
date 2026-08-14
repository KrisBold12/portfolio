import { Link } from 'react-router-dom'
import Num from '../components/Num/Num'
import Panel from '../components/Panel/Panel'
import styles from './DogBreedProject.module.css'

const REPO_URL = 'https://github.com/KrisBold12/portfolio'

/**
 * The dog breed classifier project page: the written account around the
 * live demo. Task 4 (docs/plans/web-frontend.md). The demo itself is
 * Task 5 — this page only leaves a mount slot for it, directly under the
 * header, per the Task 4 brief.
 *
 * Every figure below is copied from projects/dog-breed/README.md or
 * serving/README.md and rewritten shorter for the web; none is invented.
 * Colour follows the site's dataset convention (Global Constraints,
 * "Colour"): a number measured on Stanford Dogs is `--signal`, one measured
 * on Oxford-IIIT Pet is `--probe`, and a number that belongs to neither
 * dataset (a latency, a threshold, a temperature) carries no colour.
 */
function DogBreedProject() {
  return (
    <main className={styles.page}>
      <Link to="/" className={styles.back}>
        &larr; Back
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>Dog breed classifier</h1>
        <p className={styles.thesis}>
          A 120-breed classifier built to measure something the benchmark hides: how much
          of its accuracy comes from the model having already seen these photos during
          pretraining, and what is left once that is subtracted.
        </p>
      </header>

      {/* DEMO SLOT — Task 5 mounts the live classifier demo here, directly
          under the header. Left empty on purpose; do not add placeholder
          content or styling that would need to be undone. */}
      <div id="classifier-demo-slot" />

      <section className={styles.section}>
        <h2 className={styles.heading}>The finding</h2>
        <p className={styles.prose}>
          Stanford Dogs is built from ImageNet photos, and all <Num>120</Num> breeds are
          ImageNet classes. Any ImageNet-pretrained backbone has therefore already seen the
          test images once, during pretraining, which inflates the headline accuracy by an
          amount nobody reports.
        </p>
        <p className={styles.prose}>
          Comparing the two datasets directly would blend two effects, because the{' '}
          <Num>21</Num> breeds they share are easier than the average of all <Num>120</Num>.
          The middle row below holds the breed set fixed, so the remaining gap between it and
          the bottom row is attributable to the photos alone — and that gap, between{' '}
          <Num>4.7</Num> and <Num>7.3</Num> points, shows up in every configuration tried.
        </p>
        <Panel className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Evaluation</th>
                <th className={styles.numCol}>Images</th>
                <th className={styles.numCol}>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Stanford test, 120 breeds</td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>8580</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>89.99%</Num>
                </td>
              </tr>
              <tr>
                <td>Stanford test, 21 shared breeds</td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>1630</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>94.11%</Num>
                </td>
              </tr>
              <tr>
                <td>Oxford-IIIT Pet, same 21 breeds</td>
                <td className={styles.numCol} style={{ color: 'var(--probe)' }}>
                  <Num>4178</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--probe)' }}>
                  <Num>87.87%</Num>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Choosing the model</h2>
        <p className={styles.prose}>
          Five configurations were trained on the same data, the same seed and the same
          preprocessing: three architectures, each frozen or fine-tuned.
        </p>
        <Panel className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Experiment</th>
                <th>Architecture</th>
                <th>Regime</th>
                <th className={styles.numCol}>Stanford 120</th>
                <th className={styles.numCol}>Oxford 21</th>
                <th className={styles.numCol}>Model p95</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>convnext_t_probe</code>
                </td>
                <td>
                  <code>convnext_tiny</code>
                </td>
                <td>frozen</td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>89.99%</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--probe)' }}>
                  <Num>87.87%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>126.6 ms</Num>
                </td>
              </tr>
              <tr>
                <td>
                  <code>baseline</code>
                </td>
                <td>
                  <code>resnet50</code>
                </td>
                <td>frozen</td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>86.86%</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--probe)' }}>
                  <Num>81.38%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>61.4 ms</Num>
                </td>
              </tr>
              <tr>
                <td>
                  <code>effnet_b0</code>
                </td>
                <td>
                  <code>efficientnet_b0</code>
                </td>
                <td>fine-tuned</td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>80.85%</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--probe)' }}>
                  <Num>79.44%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>13.7 ms</Num>
                </td>
              </tr>
              <tr>
                <td>
                  <code>convnext_t</code>
                </td>
                <td>
                  <code>convnext_tiny</code>
                </td>
                <td>fine-tuned</td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>77.65%</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--probe)' }}>
                  <Num>72.67%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>117.0 ms</Num>
                </td>
              </tr>
              <tr>
                <td>
                  <code>effnet_b0_probe</code>
                </td>
                <td>
                  <code>efficientnet_b0</code>
                </td>
                <td>frozen</td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>76.31%</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--probe)' }}>
                  <Num>74.25%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>13.2 ms</Num>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <p className={styles.prose}>
          Freezing the backbone helped convnext by <Num>12.3</Num> points and hurt
          efficientnet by <Num>4.5</Num>. The training regime is not what decided the
          outcome — the quality of the pretrained features is: convnext's ImageNet-12k
          representations are already good enough for a linear head, and fine-tuning on{' '}
          <Num>85</Num> images per breed only damages them. The chosen model costs roughly{' '}
          <Num>10&times;</Num> the inference time of the fastest candidate for <Num>13.7</Num>{' '}
          points of accuracy, and a <Num>3.1</Num>-point margin over the resnet50 baseline
          that the measurement's own standard error, about <Num>0.36</Num> points, is far too
          small to explain away.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Rejecting what isn&apos;t a dog</h2>
        <p className={styles.prose}>
          The classifier always returns <Num>120</Num> logits — handed a cat, it answers with
          a breed and a confidence, because softmax has no way to say &ldquo;not a dog&rdquo;.
          The gate works a layer earlier, on the 768-dimensional features the classifier reads
          from: the training dogs form a cloud there, and the Mahalanobis distance to the
          nearest breed centre measures how far an image falls outside it.
        </p>
        <p className={styles.prose}>
          The negatives used to calibrate that distance are Oxford&apos;s <Num>2371</Num> cat
          photos, not blank walls — fur, four legs, a muzzle, the same pet-photo framing.
          Rejecting a photo of a car would prove nothing.
        </p>
        <Panel className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Threshold calibrated on</th>
                <th className={styles.numCol}>Val dogs</th>
                <th className={styles.numCol}>Oxford dogs</th>
                <th className={styles.numCol}>Oxford cats</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Stanford validation</td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>95.0%</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--probe)' }}>
                  <Num>87.8%</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--probe)' }}>
                  <Num>0.25%</Num>
                </td>
              </tr>
              <tr>
                <td>Oxford dogs (used)</td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>97.8%</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--probe)' }}>
                  <Num>95.0%</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--probe)' }}>
                  <Num>1.18%</Num>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <p className={styles.prose}>
          Calibrating on Stanford&apos;s own validation split looks best on paper but quietly
          rejects roughly one real Oxford dog in eight. Since a user&apos;s upload will
          resemble Oxford&apos;s photos far more than Stanford&apos;s, the threshold is read
          off Oxford&apos;s dogs instead — <Num>7</Num> points of real-photo acceptance
          bought for <Num>22</Num> more cats out of <Num>2371</Num>. At <Num>1.18%</Num>, the
          gate stays well inside the <Num>10%</Num> ceiling set for escalating to a dedicated
          dog detector, so that model was never built.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Making the percentage mean something</h2>
        <p className={styles.prose}>
          A raw softmax output is not a confidence: networks are systematically
          overconfident, so showing the number as-is is a claim the model cannot back.
          Expected calibration error measures the gap directly — group predictions by stated
          confidence, and compare each bucket against the accuracy it actually achieves.
        </p>
        <p className={styles.prose}>
          Temperature scaling corrects it by dividing every logit by one scalar, fitted on
          validation alone, before the softmax. Dividing by a positive constant cannot
          reorder the logits, so not a single prediction changes — only the number shown
          moves.
        </p>
        <Panel className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th className={styles.numCol}>Uncalibrated</th>
                <th className={styles.numCol}>
                  T = <Num>1.21</Num>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Validation, 1800 images</td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>2.86%</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>1.63%</Num>
                </td>
              </tr>
              <tr>
                <td>Test, 8580 images</td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>3.12%</Num>
                </td>
                <td className={styles.numCol} style={{ color: 'var(--signal)' }}>
                  <Num>0.98%</Num>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <p className={styles.prose}>
          Three times better on data the temperature never saw. The division is folded into
          the exported graph itself, so the deployed model cannot be served uncalibrated by
          skipping a step.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Serving it</h2>
        <p className={styles.prose}>
          The deployed service carries neither PyTorch nor timm — dropping the training stack
          takes roughly <Num>400 MB</Num> out of the image, at the cost of reimplementing the
          preprocessing and the Mahalanobis distance on PIL and numpy alone. Both
          reimplementations are held to the training project&apos;s originals by parity tests
          checked for exact equality, not a tolerance; that strictness is what caught a
          one-pixel rounding difference in the crop offset that a looser check would have
          missed.
        </p>
        <Panel className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Scenario</th>
                <th className={styles.numCol}>p50</th>
                <th className={styles.numCol}>p95</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Model only, onnxruntime, 2 threads</td>
                <td className={styles.numCol}>
                  <Num>104.7 ms</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>126.6 ms</Num>
                </td>
              </tr>
              <tr>
                <td>End to end, scaled JPEG decode (dev machine)</td>
                <td className={styles.numCol}>
                  <Num>141.8 ms</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>160.3 ms</Num>
                </td>
              </tr>
              <tr>
                <td>Deployed VPS, over loopback</td>
                <td className={styles.numCol}>
                  <Num>97 ms</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>127 ms</Num>
                </td>
              </tr>
              <tr>
                <td>Deployed VPS, from a laptop in Italy (HTTPS + network)</td>
                <td className={styles.numCol}>
                  <Num>134 ms</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>137 ms</Num>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <p className={styles.prose}>
          A ten-request smoke test against the running container came in at <Num>100 ms</Num>{' '}
          median, between <Num>74 ms</Num> and <Num>114 ms</Num>. The open risk going in was
          whether the <Num>300 ms</Num> budget would survive real VPS hardware: a desktop
          extrapolation had put p95 at <Num>240</Num>&ndash;<Num>400 ms</Num>, straddling the
          limit. Measured on the deployed 4-vCPU VPS it came in at <Num>137 ms</Num> p95
          including TLS and the network — the estimate was pessimistic by roughly a factor of
          two, because it had been taken through Docker Desktop on a WSL2 virtual machine
          rather than on native cores. The budget holds with both remaining levers, client-side
          downscaling and int8 quantisation, still unspent.
        </p>
      </section>

      <p className={styles.closing}>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className={styles.repoLink}>
          Full write-up and code on GitHub &rarr;
        </a>
      </p>
    </main>
  )
}

export default DogBreedProject
