import React from "react";
import styles from "./HeadlineText.module.css";

export default function HeadlineText(props) {
  return <div className={styles.text}>{props.children}</div>;
}
