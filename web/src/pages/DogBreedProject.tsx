import { Link } from 'react-router-dom'
import ClassifierDemo from '../features/demo/ClassifierDemo'
import Num from '../components/Num/Num'
import Panel from '../components/Panel/Panel'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import pageLayout from '../styles/pageLayout.module.css'
import quietLink from '../styles/quietLink.module.css'
import styles from './DogBreedProject.module.css'

const GITHUB_URL = 'https://github.com/KrisBold12'
const REPO_URL = `${GITHUB_URL}/portfolio`

// blob/HEAD resolves to whatever the repository's default branch is, so these
// keep working after dev is merged rather than pinning to the branch that
// happened to be checked out when they were written.
const README = `${REPO_URL}/blob/HEAD/projects/dog-breed/README.md`

/**
 * The page states a finding and its number. The reasoning behind it lives in
 * the README, one link per section, so a reader can stop at the result or go
 * all the way down without the page having to serve both audiences at once.
 */
function More({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <p className={styles.more}>
      <a href={`${README}${to}`} target="_blank" rel="noreferrer">
        {children} &rarr;
      </a>
    </p>
  )
}

/**
 * The dog breed classifier project page: the written account around the
 * live demo (docs/plans/web-frontend.md, Task 4). The demo itself is
 * Task 5; this page only leaves a mount slot for it, directly under the
 * header.
 *
 * Every figure below is copied from projects/dog-breed/README.md or
 * serving/README.md and rewritten shorter for the web; none is invented.
 *
 * Colour marks a figure whose dataset is load-bearing for the argument being
 * made. Where it is, a Stanford figure is `--signal` and an Oxford figure is
 * `--probe`, without exception; where the dataset is not the variable under
 * discussion, the figure carries no colour (Global Constraints, "Colour" —
 * colouring a number for a property that is not in question is decoration,
 * and a device that fires everywhere stops encoding anything). The
 * calibration table below compares T = 1 against T = 1.21 on the same
 * Stanford data, so its rows are uncoloured; the out-of-distribution table
 * compares the two datasets, so its columns are coloured.
 */
function DogBreedProject() {
  useDocumentMeta(
    'Dog breed classifier — Kristian Boldini',
    'A dog breed classifier scored on two datasets to measure benchmark contamination, with an out-of-distribution gate, calibrated confidence, and a live demo.',
  )

  return (
    <main className={pageLayout.page}>
      <Link to="/" className={`${quietLink.quietLink} ${styles.back}`}>
        &larr; Back
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>Dog breed classifier</h1>
        <p className={styles.thesis}>
          Names one of <Num>120</Num> dog breeds from a photo. The benchmark it is scored on
          is contaminated. Most of the work here went into measuring by how much.
        </p>
      </header>

      {/* DEMO SLOT: Task 5 mounts the live classifier demo here, directly
          under the header. */}
      <div id="classifier-demo-slot">
        <ClassifierDemo />
      </div>

      <section className={styles.section}>
        <h2 className={styles.heading}>At a glance</h2>
        <p className={styles.prose}>
          Five models trained and compared, evaluated on two datasets, exported to ONNX and
          checked image by image against the original, then served from a container behind a
          gate and a calibration. It is live.
        </p>
        <Panel className={styles.glance}>
          <dl className={styles.glanceGrid}>
            <div className={styles.glanceRow}>
              <dt className={styles.glanceLabel}>Accuracy, 8580 test images</dt>
              <dd className={`${styles.glanceValue} ${styles.signal}`}>
                <Num>89.99%</Num>
              </dd>
            </div>
            <div className={styles.glanceRow}>
              <dt className={styles.glanceLabel}>Lost by changing the photo source</dt>
              <dd className={styles.glanceValue}>
                <Num>6</Num> points
              </dd>
            </div>
            <div className={styles.glanceRow}>
              <dt className={styles.glanceLabel}>Cats accepted by the gate</dt>
              <dd className={styles.glanceValue}>
                <Num>4.47%</Num>
              </dd>
            </div>
            <div className={styles.glanceRow}>
              <dt className={styles.glanceLabel}>Calibration error, from 3.12%</dt>
              <dd className={styles.glanceValue}>
                <Num>0.98%</Num>
              </dd>
            </div>
            <div className={styles.glanceRow}>
              <dt className={styles.glanceLabel}>p95 in production, network included</dt>
              <dd className={styles.glanceValue}>
                <Num>137 ms</Num>
              </dd>
            </div>
          </dl>
        </Panel>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>The finding</h2>
        <p className={styles.prose}>
          Stanford Dogs is built from ImageNet photos, and all <Num>120</Num> breeds are
          ImageNet classes. Every pretrained backbone has already seen the test set during
          pretraining.
        </p>
        <p className={styles.prose}>
          So the accuracy everyone publishes on this benchmark is not measuring what it appears
          to. Nobody reports by how much.
        </p>
        <p className={styles.prose}>
          This project does. Oxford-IIIT Pet has <Num>21</Num> breeds in common with Stanford,
          photographed by different people, so the same model can be scored twice.
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
                <td>
                  Stanford test, <Num>120</Num> breeds
                </td>
                <td className={`${styles.numCol} ${styles.signal}`}>
                  <Num>8580</Num>
                </td>
                <td className={`${styles.numCol} ${styles.signal}`}>
                  <Num>89.99%</Num>
                </td>
              </tr>
              <tr>
                <td>
                  Stanford test, <Num>21</Num> shared breeds
                </td>
                <td className={`${styles.numCol} ${styles.signal}`}>
                  <Num>1630</Num>
                </td>
                <td className={`${styles.numCol} ${styles.signal}`}>
                  <Num>94.11%</Num>
                </td>
              </tr>
              <tr>
                <td>
                  Oxford-IIIT Pet, same <Num>21</Num> breeds
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
                  <Num>4178</Num>
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
                  <Num>87.87%</Num>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <p className={styles.prose}>
          The middle row is what makes the comparison honest. Those <Num>21</Num> breeds are
          easier than the average of <Num>120</Num>, so without it the drop would mix two
          causes.
        </p>
        <p className={styles.prose}>
          With the breeds held fixed, the remaining <Num>6</Num> points come from the photos.
          The gap ran between <Num>4.7</Num> and <Num>7.3</Num> points across every
          configuration tried, so it belongs to the benchmark and not to one model.
        </p>
        <More to="#results">How the three-way split was built</More>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Choosing the model</h2>
        <p className={styles.prose}>
          Five configurations, same data, same seed, same preprocessing.
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
                <td className={`${styles.numCol} ${styles.signal}`}>
                  <Num>89.99%</Num>
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
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
                <td className={`${styles.numCol} ${styles.signal}`}>
                  <Num>86.86%</Num>
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
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
                <td className={`${styles.numCol} ${styles.signal}`}>
                  <Num>80.85%</Num>
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
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
                <td className={`${styles.numCol} ${styles.signal}`}>
                  <Num>77.65%</Num>
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
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
                <td className={`${styles.numCol} ${styles.signal}`}>
                  <Num>76.31%</Num>
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
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
          Freezing the backbone helped convnext by <Num>12.3</Num> points and hurt efficientnet
          by <Num>4.5</Num>. The regime is not what decided it. The pretrained features did.
        </p>
        <p className={styles.prose}>
          Standard error on <Num>8580</Num> images is <Num>0.36</Num> points, so the{' '}
          <Num>3.1</Num>-point margin over resnet50 is real.
        </p>
        <More to="#model-selection">Why frozen beats fine-tuned here</More>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Rejecting what isn&apos;t a dog</h2>
        <p className={styles.prose}>
          The classifier has <Num>120</Num> outputs and all of them are dog breeds. Show it a
          cat and it answers confidently anyway, because softmax has no way to say &ldquo;not a
          dog&rdquo;.
        </p>
        <p className={styles.prose}>
          A demo anyone can upload to needs an answer for that.
        </p>
        <p className={styles.prose}>
          The check happens one layer earlier, on the <Num>768</Num> features behind the
          classifier. Training dogs form a cloud there, and an image is judged by how far
          outside it falls.
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
                <td className={`${styles.numCol} ${styles.signal}`}>
                  <Num>95.0%</Num>
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
                  <Num>87.8%</Num>
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
                  <Num>0.25%</Num>
                </td>
              </tr>
              <tr>
                <td>
                  Oxford dogs, <Num>95%</Num> TPR
                </td>
                <td className={`${styles.numCol} ${styles.signal}`}>
                  <Num>97.8%</Num>
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
                  <Num>95.0%</Num>
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
                  <Num>1.18%</Num>
                </td>
              </tr>
              <tr>
                <td>
                  Oxford dogs, <Num>98%</Num> TPR (used)
                </td>
                <td className={`${styles.numCol} ${styles.signal}`}>
                  <Num>99.0%</Num>
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
                  <Num>98.0%</Num>
                </td>
                <td className={`${styles.numCol} ${styles.probe}`}>
                  <Num>4.47%</Num>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <p className={styles.prose}>
          The negatives are Oxford&apos;s <Num>2371</Num> cat photos, not blank walls. The
          threshold comes off Oxford&apos;s dogs too, because a visitor&apos;s photo will
          look like theirs.
        </p>
        <p className={styles.prose}>
          Using the demo found something the datasets could not. The gate accepts{' '}
          <Num>99.7%</Num> of photos where the dog fills the frame and <Num>77.3%</Num> where
          it fills under a tenth of it. Both calibration sets are pet portraits, so a distant
          dog really is outside what the gate was shown.
        </p>
        <More to="#step-back-from-the-dog-and-the-gate-stops-working">
          The framing measurement and the threshold sweep
        </More>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Making the percentage mean&nbsp;something</h2>
        <p className={styles.prose}>
          The demo shows a percentage, which is a promise: say <Num>80%</Num> and you should be
          right four times in five. Networks are systematically overconfident, so a raw softmax
          output does not keep that promise.
        </p>
        <p className={styles.prose}>
          Expected calibration error is the size of the broken promise. Group predictions by
          the confidence they claimed, then compare each group against how often it was
          actually right.
        </p>
        <Panel className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Expected calibration error</th>
                <th className={styles.numCol}>Uncalibrated</th>
                <th className={styles.numCol}>
                  T = <Num>1.21</Num>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Validation, <Num>1800</Num> images
                </td>
                <td className={styles.numCol}>
                  <Num>2.86%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>1.63%</Num>
                </td>
              </tr>
              <tr>
                <td>
                  Test, <Num>8580</Num> images
                </td>
                <td className={styles.numCol}>
                  <Num>3.12%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>0.98%</Num>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <p className={styles.prose}>
          Temperature scaling fixes it with one number, fitted on validation and folded into
          the exported graph. Dividing by a positive constant cannot reorder the logits, so not
          one prediction changes. Only the promise does.
        </p>
        <More to="#making-the-percentage-mean-something">
          How the temperature was fitted
        </More>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Serving it</h2>
        <p className={styles.prose}>
          The deployed service carries neither PyTorch nor timm, which takes about{' '}
          <Num>400 MB</Num> out of the image. Parity tests hold the reimplemented preprocessing
          and distance to the training originals, checked for exact equality.
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
                <td>
                  Model only, onnxruntime, <Num>2</Num> threads
                </td>
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
          The <Num>300 ms</Num> budget was fixed before any model was trained. It was the last
          number still untested on real hardware. The VPS came in at <Num>137 ms</Num>, network
          included.
        </p>
        <More to="#serving">The container and the deployment</More>
      </section>

      {/* This is the page that gets shared on its own, so it carries the
          owner's identity too, not just a link back to the home page. */}
      <div className={styles.closing}>
        <span className={styles.closingIdentity}>
          Kristian Boldini &middot;{' '}
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={quietLink.quietLink}>
            github.com/KrisBold12
          </a>
        </span>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className={quietLink.quietLink}>
          Full write-up and code on GitHub &rarr;
        </a>
      </div>
    </main>
  )
}

export default DogBreedProject
