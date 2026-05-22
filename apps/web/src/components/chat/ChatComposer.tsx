"use client";

import { SendHorizontal } from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";
import styles from "./ChatComposer.module.scss";

type ChatComposerProps = {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  isSending?: boolean;
  submitLabel?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
};

export function ChatComposer({
  value,
  defaultValue = "",
  placeholder = "Напишіть повідомлення агенту...",
  disabled = false,
  isSending = false,
  submitLabel = "Надіслати повідомлення",
  onChange,
  onSubmit,
}: ChatComposerProps) {
  const [draft, setDraft] = useState(defaultValue);
  const currentValue = value ?? draft;
  const trimmedValue = currentValue.trim();
  const isSubmitDisabled = disabled || isSending || trimmedValue.length === 0;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;

    if (value === undefined) {
      setDraft(nextValue);
    }

    onChange?.(nextValue);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    onSubmit?.(trimmedValue);
  };

  return (
    <form
      className={styles.composer}
      aria-label="Поле введення повідомлення"
      onSubmit={handleSubmit}
    >
      <label className={styles.composerLabel} htmlFor="agent-message">
        Повідомлення
      </label>
      <div className={styles.composerBox}>
        <textarea
          className={styles.messageInput}
          id="agent-message"
          value={currentValue}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={2}
          onChange={handleChange}
        />
        <button
          className={styles.sendButton}
          type="submit"
          disabled={isSubmitDisabled}
          aria-label={submitLabel}
        >
          <SendHorizontal size={18} aria-hidden />
        </button>
      </div>
    </form>
  );
}
