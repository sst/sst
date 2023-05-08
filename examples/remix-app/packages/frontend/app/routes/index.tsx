import type {
  ActionFunction,
  LoaderFunction,
  LinksFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { getCount, incrementCount } from "~/models/counter.server";
import stylesUrl from "~/styles/index.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const loader: LoaderFunction = async () => {
  return json({
    count: await getCount(),
  });
};

export const action: ActionFunction = async () => {
  return json({
    count: await incrementCount(),
  });
};

export default function Index() {
  const { count } = useLoaderData();
  return (
    <div className="App">
      <p>You clicked me {count} times.</p>
      <Form method="post">
        <button type="submit">Click Me!</button>
      </Form>
    </div>
  );
}
