import { CgSpinner } from "react-icons/cg";
import * as styles from "./Loading.css";

export default function Loading() {
  return (
    <div className={styles.loading}>
      <CgSpinner className={styles.spinner} />
    </div>
  );
}
