export async function getStaticProps(context) {
  return {
    props: {
      title: context.params.id,
      isPreview: context.preview ? "true" : "false",
    },
  };
}

export async function getStaticPaths() {
  return {
    paths: [
      {
        params: {
          id: "hello",
        },
      },
      {
        params: {
          id: "world",
        },
      },
    ],
    fallback: false,
  };
}

export default function Post({ title, isPreview }) {
  return (
    <div>
      <h1>Title: {title}</h1>
      <h1>IsPreview: {isPreview}</h1>
    </div>
  );
}
