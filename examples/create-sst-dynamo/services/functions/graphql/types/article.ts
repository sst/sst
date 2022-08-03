import { Article } from "@create-sst-dynamo/core/article";
import { builder } from "../builder";

const ArticleType = builder
  .objectRef<Article.ArticleEntityType>("Article")
  .implement({
    fields: t => ({
      id: t.exposeID("articleID"),
      title: t.exposeString("title"),
      url: t.exposeString("url")
    })
  });

builder.queryFields(t => ({
  articles: t.field({
    type: [ArticleType],
    resolve: () => Article.list()
  })
}));

builder.mutationFields(t => ({
  createArticle: t.field({
    type: ArticleType,
    args: {
      title: t.arg.string({ required: true }),
      url: t.arg.string({ required: true })
    },
    resolve: async (_, args) => Article.create(args.title, args.url)
  })
}));
