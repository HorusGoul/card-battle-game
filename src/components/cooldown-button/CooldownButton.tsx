import classNames from "classnames";
import React, { useEffect, useRef, useState } from "react";
import styles from "./CooldownButton.module.scss";

export interface CooldownButtonProps {
  className?: string;
  onClick?: () => void;
  cooldownMs?: number;
  disabled?: boolean;
  children: React.ReactNode;
}

function CooldownButton({
  className,
  children,
  cooldownMs = 1000,
  onClick,
  disabled,
}: CooldownButtonProps) {
  const [throttled, setThrottled] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  function internalOnClick() {
    if (throttled) {
      return;
    }

    onClick?.();
    setThrottled(true);

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setThrottled(false);
    }, cooldownMs);
  }

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (timeoutRef.current !== null) {
        clearTimeout();
      }
    };
  }, []);

  return (
    <button
      className={classNames(styles.cooldownButton, className)}
      onClick={internalOnClick}
      disabled={throttled || disabled}
    >
      {children}

      {throttled && (
        <div
          className={styles.overlay}
          style={{ animationDuration: `${cooldownMs}ms` }}
        />
      )}
    </button>
  );
}

export default CooldownButton;
