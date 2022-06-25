export * as Article from "./article";
import { Dynamo } from "./dynamo";
import { Entity } from "electrodb";
import { ulid } from "ulid";

export const ArticleEntity = new Entity(
  {
    model: {
      version: "1",
      entity: "Article",
      service: "@@app",
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

export async function create(title: string, url: string) {
  return await ArticleEntity.create({
    articleID: ulid(),
    title,
    url,
  }).go();
}

export async function list() {
  return ArticleEntity.query.primary({}).go();
}
