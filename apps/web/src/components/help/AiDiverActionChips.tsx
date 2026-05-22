import Link from "next/link";
import styles from "./AiDiverGuide.module.scss";

export type AiDiverAction =
  | {
      id: string;
      label: string;
      href: string;
    }
  | {
      id: string;
      label: string;
      onClick: () => void;
    };

type AiDiverActionChipsProps = {
  actions: AiDiverAction[];
};

export function AiDiverActionChips({ actions }: AiDiverActionChipsProps) {
  return (
    <div className={styles.actions}>
      {actions.map((action) =>
        "href" in action ? (
          <Link className={styles.actionChip} href={action.href} key={action.id}>
            {action.label}
          </Link>
        ) : (
          <button
            className={styles.actionChip}
            key={action.id}
            type="button"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ),
      )}
    </div>
  );
}
