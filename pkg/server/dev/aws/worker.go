package aws

import "sync"

type workerStore struct {
	sync.Mutex
}

func (s *workerStore) Init(functionID, workerID string, env []string) error {
	return nil
}
