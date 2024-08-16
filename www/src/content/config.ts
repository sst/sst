import config from "../../config.ts";
import { z, getCollection, defineCollection } from "astro:content";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";

const authors = Object.keys(config.authors) as [string, ...string[]];

export const collections = {
  docs: defineCollection({
    schema: docsSchema({
      extend: z.object({
        cover: z.string().optional(),
        pagefind: z.boolean().optional(),
        template: z.enum(["doc", "splash"]).optional(),
        author: z.enum(authors as [string, ...string[]]).optional(),
      })
        .refine((data) => {
          if (data.template === "splash") {
            return data.pagefind === false;
          }
          return true;
        }, {
          message: "pagefind must be false when template is 'splash'",
          path: ['pagefind'],
        }),
    })
  }),
  //i18n: defineCollection({ type: "data", schema: i18nSchema() }),
};
