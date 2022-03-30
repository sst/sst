import { useEffect, useState } from "react";
import { ApolloConsumer, useQuery, useMutation, gql } from "@apollo/client";
import BrandNavbar from "./components/BrandNavbar";
import StatusPanel from "./components/StatusPanel";
import WsStatusPanel from "./components/WsStatusPanel";
import ConstructsPanel from "./components/ConstructsPanel";
import RuntimeLogsPanel from "./components/RuntimeLogsPanel";
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
      metadata
    }
  }
`;
const GET_INFRA_STATUS = gql`
  query GetInfraStatus {
    getInfraStatus {
      buildStatus
      buildErrors {
        type
        message
        errorCount
        warningCount
      }
      deployStatus
      deployErrors {
        type
        message
        errorCount
        warningCount
      }
      canDeploy
      canQueueDeploy
      deployQueued
    }
  }
`;
const GET_LAMBDA_STATUS = gql`
  query GetLambdaStatus {
    getLambdaStatus {
      buildStatus
      buildErrors {
        type
        message
        errorCount
        warningCount
      }
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
      metadata
    }
  }
`;
const INFRA_STATUS_SUBSCRIPTION = gql`
  subscription OnInfraStatusUpdated {
    infraStatusUpdated {
      buildStatus
      buildErrors {
        type
        message
      }
      deployStatus
      deployErrors {
        type
        message
      }
      canDeploy
      canQueueDeploy
      deployQueued
    }
  }
`;
const LAMBDA_STATUS_SUBSCRIPTION = gql`
  subscription OnLambdaStatusUpdated {
    lambdaStatusUpdated {
      buildStatus
      buildErrors {
        type
        message
      }
    }
  }
`;
const INVOKE = gql`
  mutation InvokeConstruct($data: String) {
    invoke(data: $data)
  }
`;
const DEPLOY = gql`
  mutation Deploy {
    deploy
  }
`;

export default function App({ wsClient, ...props }) {
  // Setup websocket connection watcher
  const [wsConnected, setWsConnected] = useState(false);
  wsClient.onConnected(onWsConnected);
  wsClient.onReconnected(onWsConnected);
  wsClient.onDisconnected(onWsDisconnected);

  const [invoke] = useMutation(INVOKE);
  const [deploy] = useMutation(DEPLOY);

  // Load constructs data
  let {
    loading: loadingConstructs,
    error: constructsError,
    data: constructs,
    subscribeToMore: subscribeToConstructs,
  } = useQuery(GET_CONSTRUCTS);

  if (constructs && constructs.getConstructs) {
    constructsError = constructs.getConstructs.error;
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

  // Load Infrastructure status
  const {
    loading: loadingInfraStatus,
    error: infraStatusError,
    data: infraStatus,
    subscribeToMore: subscribeToInfraStatus,
  } = useQuery(GET_INFRA_STATUS);

  // Load Lambda status
  const {
    loading: loadingLambdaStatus,
    error: lambdaStatusError,
    data: lambdaStatus,
    subscribeToMore: subscribeToLambdaStatus,
  } = useQuery(GET_LAMBDA_STATUS);

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
            getRuntimeLogs: [
              ...(prev.getRuntimeLogs || []),
              subscriptionData.data.runtimeLogAdded,
            ],
          };
        },
      });

      // Subscribe to Infrastructure status
      subscribeToInfraStatus({
        document: INFRA_STATUS_SUBSCRIPTION,
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          return {
            getInfraStatus: subscriptionData.data.infraStatusUpdated,
          };
        },
      });

      // Subscribe to Lambda status
      subscribeToLambdaStatus({
        document: LAMBDA_STATUS_SUBSCRIPTION,
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          return {
            getLambdaStatus: subscriptionData.data.lambdaStatusUpdated,
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
  }, [
    subscribeToConstructs,
    subscribeToInfraStatus,
    subscribeToLambdaStatus,
    subscribeToRuntimeLogs,
  ]);

  //////////////
  // Callbacks
  //////////////

  async function onTrigger(payload) {
    await invoke({ variables: { data: JSON.stringify(payload) } });
  }

  async function onDeploy() {
    await deploy();
  }

  async function onClearRuntimeLogs(client) {
    // Trying to clear the logs here. There might be a better way to do
    // this. Currently, we are clearing the Apollo Client's cache, and
    // then triggering a refetch.
    await client.clearStore();
    refetchRuntimeLogs();
  }

  function onWsConnected() {
    // If the page has never been successfully loaded (ie. sst start not running
    // when page loaded), then refresh the page.
    if (
      constructsError ||
      runtimeLogError ||
      infraStatusError ||
      lambdaStatusError
    ) {
      window.location.reload();
      return;
    }

    setWsConnected(true);
  }

  function onWsDisconnected() {
    setWsConnected(false);
  }

  //////////////
  // Render
  //////////////

  return (
    <div className="App">
      <BrandNavbar statusPanel={<WsStatusPanel connected={wsConnected} />} />

      <div className="panels">
        <div className="left">
          <ConstructsPanel
            constructs={constructs}
            handleTrigger={onTrigger}
            loading={loadingConstructs}
            loadError={constructsError}
          />
        </div>
        <div className="right">
          <ApolloConsumer>
            {(client) => (
              <RuntimeLogsPanel
                loading={loadingRuntimeLog}
                loadError={runtimeLogError}
                logs={runtimeLogs?.getRuntimeLogs}
                onClear={() => onClearRuntimeLogs(client)}
              />
            )}
          </ApolloConsumer>
          <StatusPanel
            loading={loadingInfraStatus || loadingLambdaStatus}
            loadError={infraStatusError || lambdaStatusError}
            infraBuildStatus={infraStatus?.getInfraStatus.buildStatus}
            infraBuildErrors={infraStatus?.getInfraStatus.buildErrors}
            infraDeployStatus={infraStatus?.getInfraStatus.deployStatus}
            infraDeployErrors={infraStatus?.getInfraStatus.deployErrors}
            infraCanDeploy={infraStatus?.getInfraStatus.canDeploy}
            infraCanQueueDeploy={infraStatus?.getInfraStatus.canQueueDeploy}
            infraDeployQueued={infraStatus?.getInfraStatus.deployQueued}
            lambdaBuildStatus={lambdaStatus?.getLambdaStatus.buildStatus}
            lambdaBuildErrors={lambdaStatus?.getLambdaStatus.buildErrors}
            handleDeploy={onDeploy}
          />
        </div>
      </div>
    </div>
  );
}
