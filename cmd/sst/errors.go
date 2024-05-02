package main

import (
	"errors"

	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
	"github.com/sst/ion/pkg/server/dev/aws"
)

func TransformError(err error) error {
	mapping := map[error]string{
		project.ErrInvalidStageName:          "The stage name is invalid. It can only contain alphanumeric characters and hyphens.",
		project.ErrV2Config:                  "You are using sst ion and this looks like an sst v2 config",
		project.ErrStageNotFound:             "Stage not found",
		project.ErrPassphraseInvalid:         "The passphrase for this app / stage is missing or invalid",
		aws.ErrIoTDelay:                      "This aws account has not had iot initialized in it before which sst depends on. It may take a few minutes before it is ready.",
		project.ErrStackRunFailed:            "",
		provider.ErrLockExists:               "",
		project.ErrVersionInvalid:            "The version range defined in the config is invalid",
		provider.ErrCloudflareMissingAccount: "This cloudflare token does not have access to any accounts. Please make sure the token has the right permissions. You can also set the CLOUDFLARE_DEFAULT_ACCOUNT_ID environment variable to the account id you want to use.",
	}

	readable := []error{
		project.ErrBuildFailed,
		project.ErrVersionMismatch,
	}

	match, ok := mapping[err]
	if ok {
		return util.NewReadableError(err, match)
	}

	for _, r := range readable {
		if errors.Is(err, r) {
			return util.NewReadableError(err, err.Error())
		}
	}

	return err
}
