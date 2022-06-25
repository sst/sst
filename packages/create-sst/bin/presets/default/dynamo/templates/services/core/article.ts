export * as Article from "./article";
import { Dynamo } from "./dynamo";
import { Entity, EntityItem } from "electrodb";
import { ulid } from "ulid";

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

export async function list() {
  return ArticleEntity.query.primary({}).go();
}

