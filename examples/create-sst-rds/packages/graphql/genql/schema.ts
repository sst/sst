export type Scalars = {
    ID: string,
    String: string,
    Boolean: boolean,
}

export interface Article {
    id: Scalars['ID']
    title: Scalars['String']
    url: Scalars['String']
    __typename: 'Article'
}

export interface Mutation {
    createArticle: Article
    __typename: 'Mutation'
}

export interface Query {
    article: Article
    articles: Article[]
    __typename: 'Query'
}

export interface ArticleGenqlSelection{
    id?: boolean | number
    title?: boolean | number
    url?: boolean | number
    __typename?: boolean | number
    __scalar?: boolean | number
}

export interface MutationGenqlSelection{
    createArticle?: (ArticleGenqlSelection & { __args: {title: Scalars['String'], url: Scalars['String']} })
    __typename?: boolean | number
    __scalar?: boolean | number
}

export interface QueryGenqlSelection{
    article?: (ArticleGenqlSelection & { __args: {articleID: Scalars['String']} })
    articles?: ArticleGenqlSelection
    __typename?: boolean | number
    __scalar?: boolean | number
}


    const Article_possibleTypes: string[] = ['Article']
    export const isArticle = (obj?: { __typename?: any } | null): obj is Article => {
      if (!obj?.__typename) throw new Error('__typename is missing in "isArticle"')
      return Article_possibleTypes.includes(obj.__typename)
    }
    


    const Mutation_possibleTypes: string[] = ['Mutation']
    export const isMutation = (obj?: { __typename?: any } | null): obj is Mutation => {
      if (!obj?.__typename) throw new Error('__typename is missing in "isMutation"')
      return Mutation_possibleTypes.includes(obj.__typename)
    }
    


    const Query_possibleTypes: string[] = ['Query']
    export const isQuery = (obj?: { __typename?: any } | null): obj is Query => {
      if (!obj?.__typename) throw new Error('__typename is missing in "isQuery"')
      return Query_possibleTypes.includes(obj.__typename)
    }
    