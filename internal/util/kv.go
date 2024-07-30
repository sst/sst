package util

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
)

type KeyValuePair[T any] struct {
	Key   string
	Value T
}
type KeyValuePairs[T any] []KeyValuePair[T]

func (p *KeyValuePairs[T]) UnmarshalJSON(data []byte) error {
	*p = make(KeyValuePairs[T], 0)
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()

	// must open with a delim token '{'
	t, err := dec.Token()
	if err != nil {
		return err
	}
	if delim, ok := t.(json.Delim); !ok || delim != '{' {
		return fmt.Errorf("expect JSON object open with '{'")
	}

	for dec.More() {
		t, err = dec.Token()
		if err != nil {
			return err
		}

		key, ok := t.(string)
		if !ok {
			return fmt.Errorf("expecting JSON key should be always a string: %T: %v", t, t)
		}
		var value T
		err = dec.Decode(&value)
		if err != nil {
			return fmt.Errorf("JSON value can't be decoded: %T: %v", value, value)
		}
		*p = append(*p, KeyValuePair[T]{Key: key, Value: value})
	}

	// must end with a delim token '}'
	t, err = dec.Token()
	if err != nil {
		return err
	}
	if delim, ok := t.(json.Delim); !ok || delim != '}' {
		return fmt.Errorf("expect JSON object close with '}'")
	}
	if err != nil {
		return err
	}

	t, err = dec.Token()
	if err != io.EOF {
		return fmt.Errorf("expect end of JSON object but got more token: %T: %v or err: %v", t, t, err)
	}

	return nil

}
func (p KeyValuePairs[T]) MarshalJSON() ([]byte, error) {
	buf := &bytes.Buffer{}
	buf.Write([]byte{'{'})
	for i, KeyValuePair := range p {
		buf.WriteString(fmt.Sprintf("%q:", fmt.Sprintf("%v", KeyValuePair.Key)))
		encoder := json.NewEncoder(buf)
		encoder.SetEscapeHTML(false)
		err := encoder.Encode(KeyValuePair.Value)
		if err != nil {
			return nil, err
		}
		if i < len(p)-1 {
			buf.Write([]byte{','})
		}
	}
	buf.Write([]byte{'}'})
	return buf.Bytes(), nil
}
