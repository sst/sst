import fs from "fs/promises";
import { VectorClient } from "sst";
const client = VectorClient("MyVectorDB");

const tags = [
  { id: "tag1", text: "Not from Earth" },
  { id: "tag2", text: "Super rich genius" },
];
const movies = [
  {
    id: "movie1",
    title: "Iron Man",
    poster: "./iron-man.jpg",
    summary:
      "A billionaire industrialist and genius inventor, Tony Stark (Robert Downey Jr.), is conducting weapons tests overseas, but terrorists kidnap him to force him to build a devastating weapon. Instead, he builds an armored suit and upends his captors. Returning to America, Stark refines the suit and uses it to combat crime and terrorism.",
  },
  {
    id: "movie2",
    title: "Thor",
    poster: "./thor.jpg",
    summary:
      "As the son of Odin (Anthony Hopkins), king of the Norse gods, Thor (Chris Hemsworth) will soon inherit the throne of Asgard from his aging father. However, on the day that he is to be crowned, Thor reacts with brutality when the gods' enemies, the Frost Giants, enter the palace in violation of their treaty. As punishment, Odin banishes Thor to Earth. While Loki (Tom Hiddleston), Thor's brother, plots mischief in Asgard, Thor, now stripped of his powers, faces his greatest threat.",
  },
  {
    id: "movie3",
    title: "Spider-Man: Homecoming",
    poster: "./spider-man.jpg",
    summary:
      "Thrilled by his experience with the Avengers, young Peter Parker returns home to live with his Aunt May. Under the watchful eye of mentor Tony Stark, Parker starts to embrace his newfound identity as Spider-Man. He also tries to return to his normal daily routine -- distracted by thoughts of proving himself to be more than just a friendly neighborhood superhero. Peter must soon put his powers to the test when the evil Vulture emerges to threaten everything that he holds dear.",
  },
  {
    id: "movie4",
    title: "Captain America: The First Avenger",
    poster: "./captain-america.jpg",
    summary:
      "It is 1941 and the world is in the throes of war. Steve Rogers (Chris Evans) wants to do his part and join America's armed forces, but the military rejects him because of his small stature. Finally, Steve gets his chance when he is accepted into an experimental program that turns him into a supersoldier called Captain America. Joining forces with Bucky Barnes (Sebastian Stan) and Peggy Carter (Hayley Atwell), Captain America leads the fight against the Nazi-backed HYDRA organization.",
  },
  {
    id: "movie5",
    title: "Black Widow",
    poster: "./black-widow.jpg",
    summary:
      "Natasha Romanoff, aka Black Widow, confronts the darker parts of her ledger when a dangerous conspiracy with ties to her past arises. Pursued by a force that will stop at nothing to bring her down, Natasha must deal with her history as a spy, and the broken relationships left in her wake long before she became an Avenger.",
  },
];

export const seeder = async () => {
  // Ingest tags
  for (const tag of tags) {
    console.log("ingesting tag", tag.id);
    await client.ingest({
      text: tag.text,
      metadata: { type: "tag", id: tag.id },
    });
  }

  // Ingest movies
  for (const movie of movies) {
    console.log("ingesting movie", movie.id);
    const imageBuffer = await fs.readFile(movie.poster);
    const image = imageBuffer.toString("base64");

    await client.ingest({
      text: movie.summary,
      image,
      metadata: { type: "movie", id: movie.id },
    });
  }

  return {
    statusCode: 200,
    body: "done",
  };
};

export const app = async (event) => {
  const prompt = event.queryStringParameters?.prompt;

  const ret = await client.retrieve({
    prompt,
    metadata: { type: "movie" },
  });

  return {
    statusCode: 200,
    body: JSON.stringify(ret, null, 2),
  };
};
