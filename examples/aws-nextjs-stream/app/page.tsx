import { Suspense } from "react";
import Bio from "@/components/bio";
import Friends from "@/components/friends";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <div className={styles.container}>
      <Bio />

      <section>
        <h2>Friends from Bikini Bottom</h2>
        <Suspense fallback={<div>Loading...</div>}>
          <Friends />
        </Suspense>
      </section>
    </div>
  );
}
