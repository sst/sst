import styles from "./bio.module.css";

const spongebob = {
  name: "SpongeBob SquarePants",
  description: "SpongeBob SquarePants is the main character of the popular animated TV series. He's a cheerful sea sponge who lives in a pineapple house in the underwater city of Bikini Bottom. SpongeBob works as a fry cook at the Krusty Krab and loves jellyfishing with his best friend Patrick Star.",
  image: "spongebob.png",
};

export default function Bio({ }) {
  return (
    <section className={styles.section}>
      <h1>{spongebob.name}</h1>
      <div className={styles.content}>
        <div className={styles.text}>
          <p>{spongebob.description}</p>
        </div>
        <img src={spongebob.image} alt={spongebob.name} />
      </div>
    </section>
  );
}
