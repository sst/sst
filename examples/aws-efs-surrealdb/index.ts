import Surreal from "surrealdb";
import { Resource } from "sst";

export const handler = async () => {
  const endpoint = `http://${Resource.MyConfig.host}:${Resource.MyConfig.port}`;

  console.log(`Connecting to`, endpoint);

  const db = new Surreal();
  await db.connect(endpoint);

  await db.use({
    namespace: Resource.MyConfig.namespace,
    database: Resource.MyConfig.database,
  });

  await db.signin({
    username: Resource.MyConfig.username,
    password: Resource.MyConfig.password,
  });

  await db.query(`INSERT INTO visits { when: time::now() }`);

  const visits = await db.query(
    `SELECT * FROM visits ORDER BY when DESC LIMIT 10`
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ "10 Most recent visits": visits[0] }, null, 2),
  };
};
