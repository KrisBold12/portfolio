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
 * Section order follows what the visitor just used. The demo either answers or
 * refuses, and prints a percentage, so the two pieces of engineering behind
 * those come first: the calibration that makes the percentage mean something
 * and the gate that produces the refusal. The five experiments and their
 * results follow, then which model was deployed, then how it is served.
 *
 * Every figure below is copied from projects/dog-breed/README.md or
 * serving/README.md; none is inferred. Claims about alternatives that were
 * never built carry no numbers, because a page whose argument is "measure it"
 * cannot estimate the thing it decided against.
 *
 * Colour marks a figure whose dataset is load-bearing for the argument being
 * made. Where it is, a Stanford figure is `--signal` and an Oxford figure is
 * `--probe`, without exception; where the dataset is not the variable under
 * discussion, the figure carries no colour (Global Constraints, "Colour" —
 * colouring a number for a property that is not in question is decoration,
 * and a device that fires everywhere stops encoding anything).
 */
function DogBreedProject() {
  useDocumentMeta(
    'Dog breed classifier — Kristian Boldini',
    'A dog breed classifier that refuses the photos it cannot answer for and reports a confidence that matches its accuracy, with the measurements behind both and a live demo.',
  )

  return (
    <main className={pageLayout.page}>
      <Link to="/" className={`${quietLink.quietLink} ${styles.back}`}>
        &larr; Back
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>Dog breed classifier</h1>
        <p className={styles.thesis}>
          Names one of <Num>120</Num> dog breeds from a photo, refuses the images it cannot
          answer for, and reports a confidence that matches how often it is right. Both of
          those are measured on photographs from a dataset it was never fitted on.
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
              <dt className={styles.glanceLabel}>Calibration error, 8580 test images</dt>
              <dd className={styles.glanceValue}>
                <Num>5.71% &rarr; 0.84%</Num>
              </dd>
            </div>
            <div className={styles.glanceRow}>
              <dt className={styles.glanceLabel}>Real dog photos the gate accepts</dt>
              <dd className={`${styles.glanceValue} ${styles.probe}`}>
                <Num>98.0%</Num>
              </dd>
            </div>
            <div className={styles.glanceRow}>
              <dt className={styles.glanceLabel}>Cats it accepts</dt>
              <dd className={`${styles.glanceValue} ${styles.probe}`}>
                <Num>4.47%</Num>
              </dd>
            </div>
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
              <dt className={styles.glanceLabel}>p95 in production, network included</dt>
              <dd className={styles.glanceValue}>
                <Num>137 ms</Num>
              </dd>
            </div>
          </dl>
        </Panel>
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
          The temperature is fitted on validation alone, so the test row is measured on{' '}
          <Num>8580</Num> images the fitting never saw. It is one scalar, folded into the
          exported graph rather than left for the server to remember. Dividing by a positive
          constant cannot reorder the logits, so not one prediction changes. Only the promise
          does.
        </p>
        <More to="#making-the-percentage-mean-something">
          How the temperature was fitted, and why it landed below one
        </More>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Refusing what it can&apos;t answer&nbsp;for</h2>
        <p className={styles.prose}>
          Softmax normalises over the <Num>120</Num> outputs, so it returns a distribution
          conditioned on the input already being a dog. A cat gets a peaked one just as
          readily, and no threshold on the confidence recovers that.
        </p>
        <p className={styles.prose}>
          So the decision happens a layer earlier, on the <Num>768</Num> penultimate features
          (Lee et al., <Num>2018</Num>): per-breed means, one shared covariance, and the
          smallest Mahalanobis distance to any centre. The covariance is fitted on within-class
          residuals rather than raw features, because on raw features it would describe the
          distance between breeds and make the gap between two of them look ordinary. That gap
          is where a cat lands.
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
          The negatives are Oxford&apos;s <Num>2371</Num> cat photos, not blank walls. Fur, four
          legs, a muzzle, the same pet-photo framing. The threshold comes off Oxford&apos;s dogs
          too, because a visitor&apos;s photo will look like theirs and not like Stanford&apos;s.
        </p>
        <p className={styles.prose}>
          A dog detector would be the other way to do this. It was not built, for two reasons.
          The budget was fixed before any model was trained, <Num>300 ms</Num> p95 on CPU and an
          image under <Num>500 MB</Num>, and a detector is a second model inside both. The gate
          instead reuses features the classifier has already computed, so it adds no forward
          pass at all. The escalation criterion was written as a number: build the detector if
          the gate lets through more than <Num>10%</Num> of cats. It lets through{' '}
          <Num>4.47%</Num>.
        </p>
        <p className={styles.prose}>
          The two also answer different questions. A detector reports whether a dog is present.
          The gate reports whether an image is one this classifier can answer for, and the next
          section is where those two come apart.
        </p>
        <More to="#rejecting-what-isnt-a-dog">
          The distance, the shared covariance, and the threshold sweep
        </More>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Step back from the dog and the gate stops&nbsp;working</h2>
        <p className={styles.prose}>
          The first version shipped at a <Num>95%</Num> true positive rate. Using the deployed
          demo turned up something neither dataset had shown: photographs taken from a few
          metres away were being refused, and the gate degraded much faster than the classifier.
        </p>
        <p className={styles.prose}>
          Stanford ships a bounding box with every image, so the test split already held the
          explanation.
        </p>
        <Panel className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Dog fills</th>
                <th className={styles.numCol}>Images</th>
                <th className={styles.numCol}>Accuracy</th>
                <th className={styles.numCol}>Accepted</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>under 10%</td>
                <td className={styles.numCol}>
                  <Num>233</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>82.8%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>77.3%</Num>
                </td>
              </tr>
              <tr>
                <td>10 to 20%</td>
                <td className={styles.numCol}>
                  <Num>622</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>88.9%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>91.6%</Num>
                </td>
              </tr>
              <tr>
                <td>20 to 35%</td>
                <td className={styles.numCol}>
                  <Num>1331</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>91.7%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>96.1%</Num>
                </td>
              </tr>
              <tr>
                <td>35 to 50%</td>
                <td className={styles.numCol}>
                  <Num>1560</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>90.4%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>98.3%</Num>
                </td>
              </tr>
              <tr>
                <td>50 to 70%</td>
                <td className={styles.numCol}>
                  <Num>2176</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>90.1%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>99.0%</Num>
                </td>
              </tr>
              <tr>
                <td>over 70%</td>
                <td className={styles.numCol}>
                  <Num>2658</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>89.7%</Num>
                </td>
                <td className={styles.numCol}>
                  <Num>99.7%</Num>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <p className={styles.prose}>
          The classifier gives up <Num>7</Num> points across that range. The gate gives up{' '}
          <Num>22</Num> and refuses nearly a quarter of the most distant dogs.
        </p>
        <p className={styles.prose}>
          Nothing was malfunctioning. Both calibration sets are pet portraits, so a dog filling
          a twentieth of the frame really is far from the training distribution, and the gate
          reported that correctly. It answered the question it was asked. The question was
          wrong, so the threshold moved to <Num>98%</Num>, which takes acceptance of those
          distant dogs from <Num>77.3%</Num> to <Num>87.6%</Num> and costs <Num>3.3</Num>{' '}
          points of cats.
        </p>
        <p className={styles.prose}>
          One more thing came out of the same table. Accuracy peaks when the dog fills a fifth
          to a third of the frame, not when it fills the whole thing.
        </p>
        <More to="#step-back-from-the-dog-and-the-gate-stops-working">
          The full sweep and what each step of true positive rate costs
        </More>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>The experiments</h2>
        <p className={styles.prose}>
          Five configurations, same data, same seed, same preprocessing. Scored twice, because
          Stanford Dogs is cut from ImageNet and every pretrained backbone has already seen its
          test images. Oxford-IIIT Pet shares <Num>21</Num> breeds, photographed by other
          people.
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
          causes. Holding the breeds fixed and changing only where the photographs came from
          leaves <Num>6.2</Num> points, and every configuration shows it, between{' '}
          <Num>4.7</Num> and <Num>8.1</Num>. It belongs to the benchmark rather than to a model.
        </p>
        <p className={styles.prose}>
          Since all <Num>120</Num> breeds are ImageNet classes, each backbone also ships a
          classifier for this task among its <Num>1000</Num> outputs. Keeping those{' '}
          <Num>120</Num> rows gives a fourth thing to compare against, and it is the one that
          came out in front.
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
          Freezing the backbone helped convnext by <Num>12.3</Num> points and hurt efficientnet
          by <Num>4.5</Num>. The regime is not what decided the outcome. The quality of the
          pretrained features did, and the right-hand column is how far that goes.
        </p>
        <More to="#the-result">The full grid, and why two of the runs prove little</More>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>What runs in production</h2>
        <p className={styles.prose}>
          <code>convnext_tiny</code> with the <Num>120</Num> dog rows of its own ImageNet
          classifier. <Num>93.11%</Num> on Stanford, <Num>88.54%</Num> on Oxford.
        </p>
        <p className={styles.prose}>
          <code>resnet50</code> scores higher on Stanford at <Num>95.05%</Num> and was not
          chosen. On Oxford, the only set whose photos are not ImageNet photos, the two are
          separated by eight images out of <Num>4178</Num>, and resnet50 falls further between
          the two datasets. Picking it would mean picking on the contaminated number, which is
          the one this project spent its time measuring.
        </p>
        <p className={styles.prose}>
          Swapping it in changed only the last matrix. The backbone was already frozen, so the{' '}
          <Num>768</Num> features are identical and the gate did not have to move. Rebuilding it
          from scratch produced a byte-for-byte identical file, threshold included, which was a
          prediction before it was a result.
        </p>
        <More to="#what-is-deployed-and-why-it-is-not-the-highest-number">
          Why the highest number was not the right one
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
          Decoding a 4K JPEG cost more than the inference until <code>Image.draft()</code> let
          libjpeg decode at <Num>1/8</Num> scale inside the DCT domain. The{' '}
          <Num>300 ms</Num> budget was the last number still untested on real hardware, and the
          VPS came in at <Num>137 ms</Num> with the network included.
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
