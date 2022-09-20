import { Article } from "@@@app/core/article";
import { builder } from "../builder";

const ArticleType = builder
  .objectRef<Article.ArticleEntityType>("Article")
  .implement({
    fields: (t) => ({
      id: t.exposeID("articleID"),
      url: t.exposeString("url"),
      title: t.exposeString("title"),
    }),
  });

builder.queryFields((t) => ({
  article: t.field({
    type: ArticleType,
    args: {
      articleID: t.arg.string({ required: true }),
    },
    resolve: async (_, args) => {
      const result = await Article.get(args.articleID);

      if (!result) {
        throw new Error("Article not found");
      }

      return result;
    },
  }),
  articles: t.field({
    type: [ArticleType],
    resolve: () => Article.list(),
  }),
}));

builder.mutationFields((t) => ({
  createArticle: t.field({
    type: ArticleType,
    args: {
      title: t.arg.string({ required: true }),
      url: t.arg.string({ required: true }),
    },
    resolve: async (_, args) => Article.create(args.title, args.url),
  }),
}));
