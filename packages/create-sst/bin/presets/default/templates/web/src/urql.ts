import { OperationContext, RequestPolicy, useQuery, useMutation } from "urql";
import { useEffect, useState } from "react";
import { TypedQueryDocumentNode } from "graphql";
import {
  generateQueryOp,
  generateMutationOp,
  QueryRequest,
  QueryResult,
  MutationRequest,
  MutationResult
} from "@@@app/graphql/genql";

export function useTypedQuery<Query extends QueryRequest>(opts: {
  query: Query;
  requestPolicy?: RequestPolicy;
  context?: Partial<OperationContext>;
  pause?: boolean;
}) {
  const { query, variables } = generateQueryOp(opts.query);
  return useQuery<QueryResult<Query>>({
    ...opts,
    query,
    variables
  });
}

export function useTypedMutation<
  Variables extends Record<string, any>,
  Mutation extends MutationRequest
>(builder: (vars: Variables) => Mutation) {
  const [mutation, setMutation] = useState<string>();
  const [variables, setVariables] = useState<any>();
  const [result, execute] = useMutation<MutationResult<Mutation>, Variables>(
    mutation as any
  );

  function executeWrapper(vars: Variables) {
    const mut = builder(vars);
    const { query, variables } = generateMutationOp(mut);
    setMutation(query);
    setVariables(variables);
  }

  useEffect(() => {
    if (!mutation) return;
    execute(variables).then(() => setMutation(undefined));
  }, [mutation]);

  return [result, executeWrapper] as const;
}
