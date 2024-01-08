package provider

import "os"

type Backend interface {
	Init(workdir string, provider map[string]string) error
	Lock(app string, stage string, out *os.File) error
	Unlock(app string, stage string, in *os.File) error
	Cancel(app string, stage string) error
	Url() string
	Env() (map[string]string, error)
}

type Provider interface {
	Init(workDir string, provider map[string]string) error
}

const SSM_NAME_BUCKET = "/sst/bootstrap"

type LockExistsError struct{}

func (e *LockExistsError) Error() string {
	return "Lock exists"
}
