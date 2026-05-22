import styles from "./AiDiverGuide.module.scss";

export function AiDiverMascot() {
  return (
    <div className={styles.mascot} aria-hidden>
      <span className={styles.snorkel} />
      <span className={styles.antenna} />
      <span className={styles.faceGlow} />
      <span className={styles.mask}>
        <span className={styles.lens} />
        <span className={styles.bridge} />
        <span className={styles.lens} />
      </span>
      <span className={styles.head}>
        <span className={styles.mouth} />
      </span>
      <span className={styles.armLeft} />
      <span className={styles.armRight} />
      <span className={styles.body}>
        <span className={styles.panel} />
      </span>
      <span className={styles.finLeft} />
      <span className={styles.finRight} />
      <span className={styles.bubbleOne} />
      <span className={styles.bubbleTwo} />
    </div>
  );
}
