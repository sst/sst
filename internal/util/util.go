package util

import "crypto/rand"

func RandomString(length int) string {
	const charset = "abcdefhkmnorstuvwxz"
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	for i := range b {
		b[i] = charset[b[i]%byte(len(charset))]
	}
	return string(b)
}

type ReadableError struct {
	Message string
}

func NewReadableError(message string) *ReadableError {
	return &ReadableError{Message: message}
}

func (e *ReadableError) Error() string {
	return e.Message
}
