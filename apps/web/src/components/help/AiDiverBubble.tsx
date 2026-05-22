import styles from "./AiDiverGuide.module.scss";

type AiDiverBubbleProps = {
  title: string;
  body: string;
};

export function AiDiverBubble({ title, body }: AiDiverBubbleProps) {
  return (
    <div className={styles.bubble}>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
