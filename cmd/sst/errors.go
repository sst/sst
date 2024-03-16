package main

import (
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project"
)

func TransformError(err error) error {
	mapping := map[error]string{}
	mapping[project.ErrInvalidStageName] = "The stage name is invalid. It can only contain alphanumeric characters and hyphens."
	match, ok := mapping[err]
	if !ok {
		return err
	}
	return util.NewReadableError(err, match)
}
