package provider

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"io"
	"os"

	"golang.org/x/exp/slog"
)

type Backend interface {
	Lock(app, stage string, out *os.File) error
	Unlock(app, stage string, in *os.File) error
	Cancel(app, stage string) error
	Env() (map[string]string, error)

	getData(key, app, stage string) (io.Reader, error)
	putData(key, app, stage string, data io.Reader) error

	setPassphrase(app, stage string, passphrase string) error
	getPassphrase(app, stage string) (string, error)
}

type DevTransport struct {
	In  chan string
	Out chan string
}

type DevEvent struct {
	*io.PipeReader
}

func (dt *DevTransport) Publish(input interface{}) error {
	jsonBytes, err := json.Marshal(input)
	if err != nil {
		return err
	}
	dt.Out <- string(jsonBytes)
	return nil
}

type Provider interface {
	Init(app, stage string, provider map[string]string) error
}

type DevSession interface {
	Cleanup() error
	Publish(json string) error
}

const SSM_NAME_BUCKET = "/sst/bootstrap"

type LockExistsError struct{}

func (e *LockExistsError) Error() string {
	return "Lock exists"
}

func Passphrase(backend Backend, app, stage string) (string, error) {
	slog.Info("getting passphrase", "app", app, "stage", stage)
	passphrase, err := backend.getPassphrase(app, stage)
	if err != nil {
		return "", err
	}

	if passphrase == "" {
		slog.Info("passphrase not found, setting passphrase", "app", app, "stage", stage)
		bytes := make([]byte, 32)
		_, err := rand.Read(bytes)
		if err != nil {
			return "", err
		}
		passphrase = base64.StdEncoding.EncodeToString(bytes)
		err = backend.setPassphrase(app, stage, passphrase)
		if err != nil {
			return "", err
		}
	}

	return passphrase, nil
}

func GetLinks(backend Backend, app, stage string) (map[string]interface{}, error) {
	data := map[string]interface{}{}
	err := getData(backend, "links", app, stage, &data)
	if err != nil {
		return nil, err
	}
	return data, err
}

func PutLinks(backend Backend, app, stage string, data map[string]interface{}) error {
	slog.Info("putting links", "app", app, "stage", stage)
	if data == nil || len(data) == 0 {
		return nil
	}
	return putData(backend, "links", app, stage, data)
}

func GetSecrets(backend Backend, app, stage string) (map[string]string, error) {
	data := map[string]string{}
	err := getData(backend, "secrets", app, stage, &data)
	if err != nil {
		return nil, err
	}
	return data, err
}

func PutSecrets(backend Backend, app, stage string, data map[string]string) error {
	slog.Info("putting secrets", "app", app, "stage", stage)
	if data == nil || len(data) == 0 {
		return nil
	}
	return putData(backend, "secrets", app, stage, data)
}

func putData(backend Backend, key, app, stage string, data interface{}) error {
	passphrase, err := Passphrase(backend, app, stage)
	if err != nil {
		return err
	}
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		return err
	}
	passphraseBytes, err := base64.StdEncoding.DecodeString(passphrase)
	if err != nil {
		return err
	}
	blockCipher, err := aes.NewCipher(passphraseBytes)
	if err != nil {
		return err
	}
	gcm, err := cipher.NewGCM(blockCipher)
	if err != nil {
		return err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err = rand.Read(nonce); err != nil {
		return err
	}
	ciphertext := gcm.Seal(nonce, nonce, jsonBytes, nil)
	return backend.putData(key, app, stage, bytes.NewReader(ciphertext))
}

func getData(backend Backend, key, app, stage string, out interface{}) error {
	reader, err := backend.getData(key, app, stage)
	if err != nil {
		return err
	}
	if reader == nil {
		return nil
	}
	passphrase, err := Passphrase(backend, app, stage)
	if err != nil {
		return nil
	}
	passphraseBytes, err := base64.StdEncoding.DecodeString(passphrase)
	if err != nil {
		return nil
	}
	blockCipher, err := aes.NewCipher(passphraseBytes)
	if err != nil {
		return nil
	}
	gcm, err := cipher.NewGCM(blockCipher)
	if err != nil {
		return nil
	}

	encryptedData, err := io.ReadAll(reader)
	if err != nil {
		return nil
	}

	nonce, ciphertext := encryptedData[:gcm.NonceSize()], encryptedData[gcm.NonceSize():]

	decrypted, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil
	}

	return json.Unmarshal(decrypted, out)
}
