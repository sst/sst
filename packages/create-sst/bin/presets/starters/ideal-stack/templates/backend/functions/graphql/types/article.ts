import { Article } from "@@@app/core/article";
import { SQL } from "@@@app/core/sql";
import { builder } from "../builder";

const ArticleType = builder.objectRef<SQL.Row["article"]>("Article").implement({
  fields: t => ({
    id: t.exposeID("articleID"),
    title: t.exposeID("title"),
    url: t.exposeID("url"),
    comments: t.field({
      type: [CommentType],
      resolve: article => Article.comments(article.articleID)
    })
  })
});

const CommentType = builder.objectRef<SQL.Row["comment"]>("Comment").implement({
  fields: t => ({
    id: t.exposeString("commentID"),
    text: t.exposeString("text")
  })
});

builder.queryFields(t => ({
  articles: t.field({
    type: [ArticleType],
    resolve: () => Article.list()
  })
}));

builder.mutationFields(t => ({
  addComment: t.field({
    type: CommentType,
    args: {
      articleID: t.arg.string({ required: true }),
      text: t.arg.string({ required: true })
    },
    resolve: (_, args) => Article.addComment(args.articleID, args.text)
  }),
  createArticle: t.field({
    type: ArticleType,
    args: {
      title: t.arg.string({ required: true }),
      url: t.arg.string({ required: true })
    },
    resolve: (_, args) => Article.create(args.title, args.url)
  })
}));
