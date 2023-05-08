import styles from "./Empty.module.css";

interface Props {
  children: React.ReactNode;
}

export default function Empty(props: Props) {
  return (
    <div className={styles.empty}>
      <p>{props.children}</p>
    </div>
  );
}
