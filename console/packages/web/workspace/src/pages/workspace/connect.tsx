import { useParams, useSearchParams } from "@solidjs/router";
import { useReplicache } from "../../data/replicache";
import { createId } from "@paralleldrive/cuid2";

export function Connect() {
  const params = useParams();
  const replicache = useReplicache();
  const [query] = useSearchParams();

  return (
    <div>
      <div>Account: {query.aws_account_id}</div>
      <div>App: {query.app}</div>
      <div>Stage: {query.stage}</div>
      <button
        onClick={async () => {
          await replicache().mutate.connect({
            aws_account_id: query.aws_account_id,
            app: query.app,
            stage: query.stage,
          });
        }}
      >
        Connect
      </button>
    </div>
  );
}
