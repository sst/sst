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

export function create(title: string, url: string) {
  return ArticleEntity.create({
    articleID: ulid(),
    title,
    url,
  }).go();
}

export function get(articleID: string) {
  return ArticleEntity.get({ articleID }).go();
}

export async function list() {
  return ArticleEntity.query.primary({}).go();
}
