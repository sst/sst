package main

import (
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project"
)

func TransformError(err error) error {
	mapping := map[error]string{
		project.ErrInvalidStageName: "The stage name is invalid. It can only contain alphanumeric characters and hyphens.",
		project.ErrV2Config:         "You are using sst ion and this looks like an sst v2 config",
		project.ErrStageNotFound:    "The stage was not found",
		project.ErrStackRunFailed:   "",
	}

	match, ok := mapping[err]
	if !ok {
		return err
	}
	return util.NewReadableError(err, match)
}
