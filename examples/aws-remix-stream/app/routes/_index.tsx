import { Suspense } from "react";
import { Await, useLoaderData } from "@remix-run/react";
import { defer, LoaderFunction } from "@remix-run/node";
import styles from "~/styles/index.css?url";

export const links = () => [
  { rel: "stylesheet", href: styles },
];

interface Character {
  name: string;
  image: string;
  description?: string;
}

interface LoaderData {
  spongebob: Character;
  friends: Character[];
}

export const loader: LoaderFunction = async () => {
  const spongebob = {
    name: "SpongeBob SquarePants",
    description: "SpongeBob SquarePants is the main character of the popular animated TV series. He's a cheerful sea sponge who lives in a pineapple house in the underwater city of Bikini Bottom. SpongeBob works as a fry cook at the Krusty Krab and loves jellyfishing with his best friend Patrick Star.",
    image: "spongebob.png",
  };
  const friendsPromise = new Promise((resolve) => {
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

  return defer({
    spongebob,
    friends: friendsPromise,
  });
};

export default function Index() {
  const { spongebob, friends } = useLoaderData<LoaderData>();

  return (
    <div className="container">
      <section className="bio-section">
        <h1>{spongebob.name}</h1>
        <div className="bio-content">
          <div className="bio-text">
            <p>{spongebob.description}</p>
          </div>
          <img src={spongebob.image} alt={spongebob.name} />
        </div>
      </section>

      <section>
        <h2>Friends from Bikini Bottom</h2>
        <Suspense fallback={<div>Loading...</div>}>
          <Await resolve={friends}>
            {(friends) => (
              <div className="character-grid">
                {friends.map((friend) => (
                  <div key={friend.name} className="character-card">
                    <img src={friend.image} alt={friend.name} />
                    <p>{friend.name}</p>
                  </div>
                ))}
              </div>
            )}
          </Await>
        </Suspense>
      </section>
    </div>
  );
}
