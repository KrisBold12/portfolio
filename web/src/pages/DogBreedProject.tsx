import { Link } from 'react-router-dom'
import ClassifierDemo from '../features/demo/ClassifierDemo'
import Num from '../components/Num/Num'
import Panel from '../components/Panel/Panel'
import styles from './DogBreedProject.module.css'

const REPO_URL = 'https://github.com/KrisBold12/portfolio'

/**
 * The dog breed classifier project page: the written account around the
 * live demo. Task 4 (docs/plans/web-frontend.md). The demo itself is
 * Task 5. This page only leaves a mount slot for it, directly under the
 * header, per the Task 4 brief.
 *
 * Every figure below is copied from projects/dog-breed/README.md or
 * serving/README.md and rewritten shorter for the web; none is invented.
 *
 * Colour marks a figure whose dataset is load-bearing for the argument being
 * made. Where it is, a Stanford figure is `--signal` and an Oxford figure is
 * `--probe`, without exception; where the dataset is not the variable under
 * discussion, the figure carries no colour (Global Constraints, "Colour",
 * amended after this task's review — colouring a number for a property that
 * is not in question is decoration, and a device that fires everywhere stops
 * encoding anything). The calibration table below compares T = 1 against
 * T = 1.21 on the same Stanford data, so its rows are uncoloured; the
 * out-of-distribution table compares the two datasets, so its columns are
 * coloured.
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
        <h2 className={styles.heading}>The finding</h2>
        <p className={styles.prose}>
          Stanford Dogs is built from ImageNet photos. All <Num>120</Num> breeds are ImageNet
          classes. Any ImageNet-pretrained backbone has therefore seen the test images before
          training starts, which inflates the published accuracy. The amount is not usually
          reported.
        </p>
        <p className={styles.prose}>
          Comparing the two datasets head to head would blend two effects, because the{' '}
          <Num>21</Num> breeds they share are easier than the average of <Num>120</Num>. The
          middle row holds the breed set fixed. What is left between it and the bottom row
          comes from the photos. That gap ran between <Num>4.7</Num> and <Num>7.3</Num> points
          across every configuration tried.
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
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Choosing the model</h2>
        <p className={styles.prose}>
          Five configurations, same data, same seed, same preprocessing. Three architectures,
          each one frozen and fine-tuned.
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
          by <Num>4.5</Num>. So the regime is not what decided the outcome. The pretrained
          features did. Convnext&apos;s ImageNet-12k representations are already good enough
          for a linear head, and fine-tuning on <Num>85</Num> images per breed damages them.
        </p>
        <p className={styles.prose}>
          The chosen model is about <Num>10&times;</Num> slower than the fastest candidate. It
          buys <Num>13.7</Num> points of accuracy, and <Num>3.1</Num> over the resnet50
          baseline. Standard error on <Num>8580</Num> images is around <Num>0.36</Num> points,
          so both margins are real.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Rejecting what isn&apos;t a dog</h2>
        <p className={styles.prose}>
          The classifier always returns <Num>120</Num> logits. Hand it a cat and it answers
          with a breed and a confidence, because softmax has no way to say &ldquo;not a
          dog&rdquo;. The gate works one layer earlier, on the <Num>768</Num> features the
          classifier reads from. The training dogs form a cloud there. Mahalanobis distance to
          the nearest breed centre measures how far an image falls outside it.
        </p>
        <p className={styles.prose}>
          The negatives are Oxford&apos;s <Num>2371</Num> cat photos. Fur, four legs, a muzzle,
          the same pet-photo framing. A gate that only turns away pictures of cars proves
          nothing.
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
                <td>Oxford dogs (used)</td>
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
            </tbody>
          </table>
        </Panel>
        <p className={styles.prose}>
          Calibrating the threshold on Stanford&apos;s own validation split scores well there
          and turns away about one real Oxford dog in eight. A user&apos;s photo will look like
          Oxford&apos;s, not Stanford&apos;s. So the threshold comes off Oxford&apos;s dogs
          instead. That trade buys <Num>7</Num> points of real-photo acceptance for{' '}
          <Num>22</Num> more cats out of <Num>2371</Num>.
        </p>
        <p className={styles.prose}>
          The design had set <Num>10%</Num> cat acceptance as the point where a dedicated dog
          detector would be worth building. The gate came in at <Num>1.18%</Num>.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Making the percentage mean something</h2>
        <p className={styles.prose}>
          A softmax output is not a confidence. Networks are systematically overconfident, so
          showing the raw number claims more than the model can back.
        </p>
        <p className={styles.prose}>
          Expected calibration error measures the gap. Group the predictions by stated
          confidence, then compare each bucket against the accuracy it actually reached.
          Temperature scaling corrects it by dividing every logit by one scalar before the
          softmax, fitted on validation. Dividing by a positive constant cannot reorder logits,
          so no prediction changes. Only the number shown moves.
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
          Three times better on data the temperature never saw. The division is folded into the
          exported graph, so the deployed model cannot be served uncalibrated by skipping a
          step.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Serving it</h2>
        <p className={styles.prose}>
          The deployed service carries neither PyTorch nor timm. Dropping the training stack
          takes about <Num>400 MB</Num> out of the image and costs a guarantee: the
          preprocessing and the Mahalanobis distance have to be reimplemented on PIL and numpy.
          Parity tests hold both to the training originals, checked for exact equality rather
          than a tolerance. That is what caught a one-pixel rounding difference in the crop
          offset.
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
          The <Num>300 ms</Num> budget was fixed before any model was trained. Until deployment
          it was the one number that had never been tested on real hardware. A desktop
          extrapolation put p95 somewhere between <Num>240</Num> and <Num>400 ms</Num>. On the
          VPS it came in at <Num>137 ms</Num> with TLS and the network included. The estimate
          was pessimistic by a factor of two, because it had been taken through Docker Desktop
          on a WSL2 virtual machine rather than on native cores.
        </p>
        <p className={styles.prose}>
          Client-side downscaling and int8 quantisation were held in reserve for this. Neither
          was needed.
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
