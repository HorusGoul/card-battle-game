import classNames from "classnames";
import React, { useEffect, useRef, useState } from "react";
import styles from "./CooldownButton.module.scss";

export interface CooldownButtonProps {
  className?: string;
  onClick?: () => void;
  cooldownMs?: number;
  disabled?: boolean;
  type?: "submit" | "button";
  children: React.ReactNode;
}

function CooldownButton({
  className,
  children,
  cooldownMs = 1000,
  onClick,
  disabled,
  type = "button",
  ...props
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
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <button
      type={type}
      className={classNames(styles.cooldownButton, className)}
      onClick={internalOnClick}
      disabled={throttled || disabled}
      {...props}
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
