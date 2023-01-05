import { getGraphQLParameters, processRequest, } from "graphql-helix";
import { Handler, useEvent, useLambdaContext } from "../context/handler.js";
import { useHeaders, useMethod, useJsonBody, useQueryParams, } from "../api/index.js";
export function GraphQLHandler(config) {
    return Handler("api", async () => {
        const request = {
            body: useJsonBody(),
            query: useQueryParams(),
            method: useMethod(),
            headers: useHeaders(),
        };
        const { operationName, query, variables } = getGraphQLParameters(request);
        const result = await processRequest({
            operationName,
            query,
            variables,
            request,
            execute: config.execute,
            schema: config.schema,
            formatPayload: config.formatPayload,
            contextFactory: async (execution) => {
                if (config.context) {
                    return config.context({
                        event: useEvent("api"),
                        context: useLambdaContext(),
                        execution,
                    });
                }
                return;
            },
        });
        if (result.type === "RESPONSE") {
            return {
                statusCode: result.status,
                body: JSON.stringify(result.payload),
                headers: Object.fromEntries(result.headers.map((h) => [h.name, h.value])),
            };
        }
        return {
            statusCode: 500,
        };
    });
}
