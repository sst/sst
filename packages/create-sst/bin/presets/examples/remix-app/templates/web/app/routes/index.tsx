import {
  useLoaderData,
} from "@remix-run/react";

export async function loader() {
  return {
    TABLE_NAME: process.env.TABLE_NAME,
  };
}

export default function Index() {
  const data = useLoaderData();
  console.log(data);
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Welcome to RemixSite demo</h1>
      <p>Table name is: {data.TABLE_NAME}</p>
    </div>
  );
}
