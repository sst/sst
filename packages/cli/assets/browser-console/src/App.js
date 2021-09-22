import Ansi from "ansi-to-react";
import { useEffect, useState } from "react";
import { ApolloConsumer, useQuery, useMutation, gql } from "@apollo/client";
import Button from "./components/Button";
import BrandNavbar from "./components/BrandNavbar";
import ConstructPanel from "./components/ConstructPanel";
import "./App.scss";

const GET_CONSTRUCTS = gql`
  query GetConstructs {
    getConstructs {
      error
      isLoading
      constructs
    }
  }
`;
const GET_RUNTIME_LOGS = gql`
  query GetRuntimeLogs {
    getRuntimeLogs {
      message
    }
  }
`;
const GET_INFRA_BUILD_STATUS = gql`
  query GetInfraBuildStatus {
    getInfraBuildStatus {
      status
      errors
    }
  }
`;
const CONSTRUCTS_SUBSCRIPTION = gql`
  subscription OnConstructsUpdated {
    constructsUpdated {
      error
      isLoading
      constructs
    }
  }
`;
const RUNTIME_LOGS_SUBSCRIPTION = gql`
  subscription OnRuntimeLogAdded {
    runtimeLogAdded {
      message
    }
  }
`;
const INFRA_BUILD_STATUS_SUBSCRIPTION = gql`
  subscription OnInfraBuildStatusUpdated {
    infraBuildStatusUpdated {
      status
      errors
    }
  }
`;
const INVOKE = gql`
  mutation InvokeConstruct($data: String) {
    invoke(data: $data)
  }
`;

export default function App() {
  const [invoke, { loading: loadingInvoke, error: invokeError }] = useMutation(
    INVOKE
  );

  // Load constructs data
  let {
    loading: loadingConstructs,
    error: constructsError,
    data: constructs,
    subscribeToMore: subscribeToConstructs,
  } = useQuery(GET_CONSTRUCTS);

  if (constructs && constructs.getConstructs) {
    constructsError = constructs.getConstructs.error;
    loadingConstructs = constructs.getConstructs.isLoading;
    constructs = JSON.parse(constructs.getConstructs.constructs);
  }

  // Load Lambda logs
  const {
    loading: loadingRuntimeLog,
    error: runtimeLogError,
    data: runtimeLogs,
    refetch: refetchRuntimeLogs,
    subscribeToMore: subscribeToRuntimeLogs,
  } = useQuery(GET_RUNTIME_LOGS);

  // Load Infrastructure build status
  const {
    loading: loadingInfraBuildStatus,
    error: infraBuildStatusError,
    data: infraBuildStatus,
    subscribeToMore: subscribeToInfraBuildStatus,
  } = useQuery(GET_INFRA_BUILD_STATUS);

  useEffect(() => {
    try {
      // Subscribe to constructs data
      // note: replace initial queried data with subscribed data
      subscribeToConstructs({
        document: CONSTRUCTS_SUBSCRIPTION,
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          return {
            getConstructs: subscriptionData.data.constructsUpdated,
          };
        },
      });

      // Subscribe to Lambda logs
      // note: append subscribed logs to the initial queried logs
      subscribeToRuntimeLogs({
        document: RUNTIME_LOGS_SUBSCRIPTION,
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          return {
            // note: if initial query failed "prev.getRuntimeLogs" is undefined,
            //       we need to initialize it to empty array.
            //       A sequence that can lead to this would be:
            //       1. sst start is not running
            //       2. open the browser console, and the initial query will fail
            //       3. run sst start
            //       4. invoke a request and the browser console will receive a
            //          websocket event, and this code will be invoked
            getRuntimeLogs: [...(prev.getRuntimeLogs || []), subscriptionData.data.runtimeLogAdded],
          };
        },
      });

      // Subscribe to Infrastructure status
      subscribeToInfraBuildStatus({
        document: INFRA_BUILD_STATUS_SUBSCRIPTION,
        updateQuery: (prev, { subscriptionData }) => {
          // TODO
          console.log({ subscriptionData });
          if (!subscriptionData.data) return prev;
          return {
            getInfraBuildStatus: subscriptionData.data.infraBuildStatusUpdated,
          };
        },
      });
    } catch (e) {
      // Apollo client's subscriptions get disconnected on React hot reload, and
      // calling `subscribeToMore` fails with the error:
      //  TypeError: Cannot read property 'subscribeToMore' of undefined
      // For development purposes, we are ignoring the error so the page doesn't
      // show an error on hot reload.
      // Note the subscription connection is closed.
      // https://github.com/apollographql/apollo-client/issues/6437
      if (
        process.env.NODE_ENV === "development" &&
        (e.message === "Cannot read property 'subscribeToMore' of undefined" ||
          e.message ===
            "undefined is not an object (evaluating '_this.currentObservable.subscribeToMore')")
      ) {
        return;
      }
      throw e;
    }
  }, []);

  //////////////
  // Callbacks
  //////////////

  function onTrigger(payload) {
    invoke({ variables: { data: JSON.stringify(payload) } }).catch((e) => {
      // ignore the error, the invokeError will be set
    });
  }

  //////////////
  // Render
  //////////////

  function renderRuntimeLogs() {
    const hasLogs = runtimeLogs && runtimeLogs.getRuntimeLogs && runtimeLogs.getRuntimeLogs.length > 0;
    return (
      <div>
        <h3>Logs</h3>
        <ApolloConsumer>
          { client =>
            <Button
              disabled={!hasLogs}
              onClick={async () => {
                // Trying to clear the logs here. There might be a better way to do
                // this. Currently, we are clearing the Apollo Client's cache, and
                // then triggering a refetch.
                await client.clearStore();
                refetchRuntimeLogs();
              }}>
              Clear
            </Button> }
        </ApolloConsumer>
        {!hasLogs && <p>Listening for logs...</p>}
        {hasLogs &&
          <pre>
            {runtimeLogs.getRuntimeLogs.map((log) => (
              <Ansi>{log.message}</Ansi>
            ))}
          </pre>}
      </div>
    );
  }

  function renderInfraBuildStatus() {
    const status = infraBuildStatus?.getInfraBuildStatus?.status;
    return (
      <div>
        <h3>Infrastructure Build</h3>
        <pre>{ status }</pre>
        { (status === "can_deploy" || status === "can_queue_deploy") &&
          <Button
            onClick={async () => { }}>
            { status === "can_deploy" ? "Deploy Now" : "Deploy once done" }
          </Button> }
        { status === "failed" &&
          <pre>
            { infraBuildStatus.getInfraBuildStatus.errors.map(error =>
              <Ansi>{ error }</Ansi>
            ) }
          </pre>}
      </div>
    );
  }

  return (
    <div className="App">
      <BrandNavbar />
      <div className="panels">
        <div className="constructs">
          {constructsError && <p>Failed to Load!</p>}
          {loadingConstructs && <p>Loading...</p>}
          {constructs && constructs.map(construct =>
            <ConstructPanel
              construct={construct}
              onTrigger={onTrigger} />
          )}
        </div>
        <div className="logs">
          <div>{renderInfraBuildStatus()}</div>
          <div>{renderRuntimeLogs()}</div>
        </div>
      </div>
    </div>
  );
}
