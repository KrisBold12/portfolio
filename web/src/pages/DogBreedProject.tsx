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
 * The dog breed classifier project page: the written account around the live
 * demo.
 *
 * Section order is the argument, not the chronology. The zero-shot result
 * leads because it is the one a reader remembers; contamination follows
 * because it is what explains the result; the deployment choice comes third
 * because it only makes sense once both are on the page.
 *
 * Every figure below is copied from projects/dog-breed/README.md or
 * serving/README.md and rewritten shorter for the web; none is invented.
 *
 * Colour marks a figure whose dataset is load-bearing for the argument being
 * made. Where it is, a Stanford figure is `--signal` and an Oxford figure is
 * `--probe`, without exception; where the dataset is not the variable under
 * discussion, the figure carries no colour (Global Constraints, "Colour" —
 * colouring a number for a property that is not in question is decoration,
 * and a device that fires everywhere stops encoding anything). The zero-shot
 * table compares trained against untrained on one dataset at a time, so its
 * columns are uncoloured; the out-of-distribution table compares the two
 * datasets, so its columns are coloured.
 */
function DogBreedProject() {
  useDocumentMeta(
    'Dog breed classifier — Kristian Boldini',
    'A dog breed classifier whose deployed model was never trained, with the measurements that led to that decision: benchmark contamination, an out-of-distribution gate, calibrated confidence, and a live demo.',
  )

  return (
    <main className={pageLayout.page}>
      <Link to="/" className={`${quietLink.quietLink} ${styles.back}`}>
        &larr; Back
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>Dog breed classifier</h1>
        <p className={styles.thesis}>
          Five models trained on Stanford Dogs, and the one in production is none of them. It
          is the classifier that was already inside the pretrained weights, with{' '}
          <Num>880</Num> of its <Num>1000</Num> outputs deleted.
        </p>
      </header>

      <div id="classifier-demo-slot">
        <ClassifierDemo />
      </div>

      <section className={styles.section}>
        <h2 className={styles.heading}>At a glance</h2>
        <p className={styles.prose}>
          Five models compared on two datasets, then the winner exported, checked image by
          image against the original, and served from a container. Every number below is in
          the repository.
        </p>
        <Panel className={styles.glance}>
          <dl className={styles.glanceGrid}>
            <div className={styles.glanceRow}>
              <dt className={styles.glanceLabel}>Accuracy, 8580 test images</dt>
              <dd className={`${styles.glanceValue} ${styles.signal}`}>
                <Num>93.11%</Num>
              </dd>
            </div>
            <div className={styles.glanceRow}>
              <dt className={styles.glanceLabel}>Lost by changing the photo source</dt>
              <dd className={styles.glanceValue}>
                <Num>6.2</Num> points
              </dd>
            </div>
            <div className={styles.glanceRow}>
              <dt className={styles.glanceLabel}>Cats accepted by the gate</dt>
              <dd className={styles.glanceValue}>
                <Num>4.47%</Num>
              </dd>
            </div>
            <div className={styles.glanceRow}>
              <dt className={styles.glanceLabel}>Calibration error, 8580 test images</dt>
              <dd className={styles.glanceValue}>
                <Num>5.71% &rarr; 0.84%</Num>
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
        <h2 className={styles.heading}>The model was never trained</h2>
        <p className={styles.prose}>
          Stanford Dogs is cut from ImageNet, and all <Num>120</Num> of its breeds are
          ImageNet-1k classes. So every pretrained backbone already carries a classifier for
          this exact task, sitting unused among its <Num>1000</Num> outputs.
        </p>
        <p className={styles.prose}>
          Keep the <Num>120</Num> rows that name dog breeds, delete the other{' '}
          <Num>880</Num>, and you have a classifier for this task that has seen none of the
          training data. It is the baseline everything else should be read against.
        </p>
        <Panel className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Experiment</th>
                <th>Backbone</th>
                <th className={styles.numCol}>Trained</th>
                <th className={styles.numCol}>Backbone alone</th>
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
                <td className={styles.numCol}>
                  <Num>89.99%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>93.11%</Num>
                </td>
              </tr>
              <tr>
                <td>
                  <code>baseline</code>
                </td>
                <td>
                  <code>resnet50</code>
                </td>
                <td className={styles.numCol}>
                  <Num>86.86%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>95.05%</Num>
                </td>
              </tr>
              <tr>
                <td>
                  <code>effnet_b0</code>
                </td>
                <td>
                  <code>efficientnet_b0</code>
                </td>
                <td className={styles.numCol}>
                  <Num>80.85%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>93.04%</Num>
                </td>
              </tr>
              <tr>
                <td>
                  <code>convnext_t</code>
                </td>
                <td>
                  <code>convnext_tiny</code>
                </td>
                <td className={styles.numCol}>
                  <Num>77.65%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>93.11%</Num>
                </td>
              </tr>
              <tr>
                <td>
                  <code>effnet_b0_probe</code>
                </td>
                <td>
                  <code>efficientnet_b0</code>
                </td>
                <td className={styles.numCol}>
                  <Num>76.31%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>93.04%</Num>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <p className={styles.prose}>
          Stanford test split, <Num>8580</Num> images. The right-hand column is the same
          backbone with its original head, restricted to the <Num>120</Num> breeds. Nothing
          was tuned to produce it.
        </p>
        <p className={styles.prose}>
          On Oxford, whose photos are not ImageNet photos, the two sides converge:{' '}
          <Num>87.87%</Num> against <Num>88.54%</Num>. That is the next section.
        </p>
        <More to="#the-result">The full grid, and why two of the runs prove little</More>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>How much of the score is the benchmark</h2>
        <p className={styles.prose}>
          A pretrained backbone has already seen these photographs, with these labels, during
          pretraining. That inflates the published number and nobody reports by how much.
        </p>
        <p className={styles.prose}>
          Oxford-IIIT Pet shares <Num>21</Num> breeds with Stanford, photographed by other
          people. Scoring the same model on both separates the two effects.
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
                  <Num>93.11%</Num>
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
                  <Num>94.72%</Num>
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
                  <Num>88.54%</Num>
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
          Holding the breeds fixed and changing only where the photographs came from leaves{' '}
          <Num>6.2</Num> points. Every configuration shows it, between <Num>4.7</Num> and{' '}
          <Num>8.1</Num> points, so it belongs to the benchmark and not to one model.
        </p>
        <More to="#how-much-of-the-score-is-the-benchmark">How the three-way split works</More>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>What runs in production</h2>
        <p className={styles.prose}>
          <code>resnet50</code> has the strongest untouched head of the three at{' '}
          <Num>95.05%</Num>. It is not what is deployed.
        </p>
        <p className={styles.prose}>
          On Oxford, the only set whose photos are not ImageNet photos, <code>resnet50</code>{' '}
          and <code>convnext_tiny</code> are separated by eight images out of{' '}
          <Num>4178</Num>. <code>resnet50</code> also falls further between the two datasets,{' '}
          <Num>7.71</Num> points against <Num>6.18</Num>, which is what more memorisation
          looks like.
        </p>
        <p className={styles.prose}>
          Choosing it would mean choosing on the contaminated number, which is the mistake
          this page is about. They are tied on the honest one, so the tiebreak is cost, and
          convnext was already deployed with its gate calibrated and its latency measured.
        </p>
        <p className={styles.prose}>
          Swapping it in changed only the last matrix. The backbone was already frozen, so the{' '}
          <Num>768</Num> features behind the classifier are identical and the gate below did
          not have to move. Rebuilding it from scratch produced a byte-for-byte identical
          file, threshold included, which was a prediction before it was a result.
        </p>
        <More to="#what-is-deployed-and-why-it-is-not-the-highest-number">
          Why the highest number was not the right one
        </More>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Rejecting what isn&apos;t a dog</h2>
        <p className={styles.prose}>
          The classifier has <Num>120</Num> outputs and all of them are dog breeds. Show it a
          cat and it answers confidently anyway, because softmax has no way to say &ldquo;not a
          dog&rdquo;.
        </p>
        <p className={styles.prose}>A demo anyone can upload to needs an answer for that.</p>
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
          threshold comes off Oxford&apos;s dogs too, because a visitor&apos;s photo will look
          like theirs.
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
          right four times in five. A raw softmax output does not keep that promise, and
          expected calibration error is the size of the gap.
        </p>
        <p className={styles.prose}>
          Textbooks say networks overstate their confidence and the fix is to flatten the
          output. This one does the opposite. The temperature that corrects it came out at{' '}
          <Num>0.76</Num>, below <Num>1</Num>, which sharpens.
        </p>
        <Panel className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Expected calibration error</th>
                <th className={styles.numCol}>Uncalibrated</th>
                <th className={styles.numCol}>
                  T = <Num>0.76</Num>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Validation, <Num>1800</Num> images
                </td>
                <td className={styles.numCol}>
                  <Num>5.10%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>1.22%</Num>
                </td>
              </tr>
              <tr>
                <td>
                  Test, <Num>8580</Num> images
                </td>
                <td className={styles.numCol}>
                  <Num>5.71%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>0.84%</Num>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <p className={styles.prose}>
          The cause is the recipe, not the architecture: label smoothing and mixup teach a
          network never to commit, and both went into these weights. The fix is one scalar,
          folded into the exported graph. It cannot reorder the logits, so not one prediction
          changes. Only the promise does.
        </p>
        <More to="#making-the-percentage-mean-something">How the temperature was fitted</More>
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

      <section className={styles.section}>
        <h2 className={styles.heading}>What I would do differently</h2>
        <p className={styles.prose}>
          The untrained baseline should have been the first measurement rather than the last.
          Five training runs went into beating a number that the weights they all started from
          had already beaten.
        </p>
        <p className={styles.prose}>
          The reason it came last is the same fact as the finding. A baseline like this only
          exists because the <Num>120</Num> target labels are themselves ImageNet labels; on a
          genuinely new dataset there is nothing to compare against, which is why the step is
          easy to skip. Skipping it means not noticing the labels are ImageNet labels, and
          noticing that is the contamination result.
        </p>
        <More to="#what-i-would-do-differently">The order the work actually happened in</More>
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
