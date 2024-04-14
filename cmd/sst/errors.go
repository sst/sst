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
		project.ErrInvalidStageName:  "The stage name is invalid. It can only contain alphanumeric characters and hyphens.",
		project.ErrV2Config:          "You are using sst ion and this looks like an sst v2 config",
		project.ErrStageNotFound:     "Stage not found",
		project.ErrPassphraseInvalid: "The passphrase for this app / stage is missing or invalid",
		aws.ErrIoTDelay:              "This aws account has not had iot initialized in it before which sst depends on. It may take a few minutes before it is ready.",
		project.ErrStackRunFailed:    "",
		provider.ErrLockExists:       "",
	}

	readable := []error{
		project.ErrBuildFailed,
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
