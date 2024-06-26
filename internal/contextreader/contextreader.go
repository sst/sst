package contextreader

import (
	"context"
	"io"
)

type ContextReader struct {
	ctx    context.Context
	reader io.Reader
}

func (cr *ContextReader) Read(p []byte) (int, error) {
	err := cr.ctx.Err()
	if err != nil {
		return 0, cr.ctx.Err()
	}
	return cr.reader.Read(p)
}

func New(ctx context.Context, reader io.Reader) *ContextReader {
	return &ContextReader{
		ctx:    ctx,
		reader: reader,
	}
}
