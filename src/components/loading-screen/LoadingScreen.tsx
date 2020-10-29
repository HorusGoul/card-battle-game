import React from "react";
import styles from "./LoadingScreen.module.scss";

export interface LoadingScreenProps {
  text?: string;
}

function LoadingScreen({ text = "Loading" }: LoadingScreenProps) {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.spinner} />

      <span className={styles.text}>{text}</span>
    </div>
  );
}

export default LoadingScreen;
