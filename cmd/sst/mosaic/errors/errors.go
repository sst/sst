package errors

import (
	"errors"

	"github.com/sst/ion/cmd/sst/mosaic/aws"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
	"github.com/sst/ion/pkg/server"
)

func Transform(err error) error {
	mapping := map[error]string{
		project.ErrInvalidStageName:          "The stage name is invalid. It can only contain alphanumeric characters and hyphens.",
		project.ErrInvalidAppName:            "The app name is invalid. It can only contain alphanumeric characters and hyphens.",
		project.ErrV2Config:                  "You are using sst ion and this looks like an sst v2 config",
		project.ErrStageNotFound:             "Stage not found",
		project.ErrPassphraseInvalid:         "The passphrase for this app / stage is missing or invalid",
		aws.ErrIoTDelay:                      "This aws account has not had iot initialized in it before which sst depends on. It may take a few minutes before it is ready.",
		project.ErrStackRunFailed:            "",
		provider.ErrLockExists:               "",
		project.ErrVersionInvalid:            "The version range defined in the config is invalid",
		provider.ErrCloudflareMissingAccount: "The Cloudflare Account ID was not able to be determined from this token. Make sure it has permissions to fetch account information or you can set the CLOUDFLARE_DEFAULT_ACCOUNT_ID environment variable to the account id you want to use.",
		server.ErrServerNotFound:             "You are currently trying to run a frontend or some other process on its own - starting from v3 `sst dev` can bring up all of the processes in your application in a single window. Simply run `sst dev` in the same directory as your `sst.config.ts`. If this is not clear check out the monorepo example here: https://github.com/sst/ion/tree/dev/examples/aws-monorepo\n\n   If you prefer running your processes in different terminal windows, you can start just the deploy process by running `sst dev --mode=basic` and then bring up your process with `sst dev -- <command>` in another terminal window.",
		provider.ErrBucketMissing:            "The state bucket is missing, it may have been accidentally deleted. Go to https://console.aws.amazon.com/systems-manager/parameters/%252Fsst%252Fbootstrap/description?region=us-east-1&tab=Table and check if the state bucket mentioned there exists. If it doesn't you can recreate it or delete the `/sst/bootstrap` key to force recreation.",
	}

	readable := []error{
		project.ErrBuildFailed,
		project.ErrVersionMismatch,
	}

	for compare, msg := range mapping {
		if errors.Is(err, compare) || err == compare {
			return util.NewReadableError(err, msg)
		}
	}

	for _, r := range readable {
		if errors.Is(err, r) {
			return util.NewReadableError(err, err.Error())
		}
	}

	return err
}
