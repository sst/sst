import React from "react";
import styles from "./ChangeText.module.css";

export default function ChangeText(props) {
  return <div className={styles.text}>{props.children}</div>;
}
