import styles from "./friends.module.css";

interface Character {
  name: string;
  image: string;
}

function friendsPromise() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        [
          { name: "Patrick Star", image: "patrick.png" },
          { name: "Sandy Cheeks", image: "sandy.png" },
          { name: "Squidward Tentacles", image: "squidward.png" },
          { name: "Mr. Krabs", image: "mr-krabs.png" },
        ]
      );
    }, 3000);
  });
}

export default async function Friends() {
  const friends = await friendsPromise() as Character[];

  return (
    <div className={styles.grid}>
      {friends.map((friend) => (
        <div key={friend.name} className={styles.card}>
          <img className={styles.img} src={friend.image} alt={friend.name} />
          <p>{friend.name}</p>
        </div>
      ))}
    </div>
  );
}
