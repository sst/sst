import { ulid } from "ulid";
import { Entity, EntityItem } from "electrodb";
import { Dynamo } from "./dynamo";

export * as Article from "./article";

export const ArticleEntity = new Entity(
  {
    model: {
      version: "1",
      entity: "Article",
      service: "scratch",
    },
    attributes: {
      articleID: {
        type: "string",
        required: true,
        readOnly: true,
      },
      title: {
        type: "string",
        required: true,
      },
      url: {
        type: "string",
        required: true,
      },
    },
    indexes: {
      primary: {
        pk: {
          field: "pk",
          composite: [],
        },
        sk: {
          field: "sk",
          composite: ["articleID"],
        },
      },
    },
  },
  Dynamo.Configuration
);

export type ArticleEntityType = EntityItem<typeof ArticleEntity>;

export async function create(title: string, url: string) {
  const result = await ArticleEntity.create({
    articleID: ulid(),
    title,
    url,
  }).go();

  return result.data;
}

export async function get(articleID: string) {
  const result = await ArticleEntity.get({ articleID }).go();

  return result.data;
}

export async function list() {
  const result = await ArticleEntity.query.primary({}).go();

  return result.data;
}
