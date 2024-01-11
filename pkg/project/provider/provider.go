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
	Init(provider map[string]string) error
	Lock(app string, stage string, out *os.File) error
	Unlock(app string, stage string, in *os.File) error
	Cancel(app string, stage string) error
	ListSecrets(app string, stage string) (io.Reader, error)
	SetSecrets(app string, stage string, data io.Reader) error
	Env() (map[string]string, error)

	setPassphrase(app string, stage string, passphrase string) error
	getPassphrase(app string, stage string) (string, error)
}

type Provider interface {
	Init(provider map[string]string) error
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
		passphrase := base64.StdEncoding.EncodeToString(bytes)
		err = backend.setPassphrase(app, stage, passphrase)
		if err != nil {
			return "", err
		}
	}

	return passphrase, nil
}

func SetSecrets(backend Backend, app, stage string, data map[string]string) error {
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
	return backend.SetSecrets(app, stage, bytes.NewReader(ciphertext))
}

func ListSecrets(backend Backend, app, stage string) (map[string]string, error) {
	data := map[string]string{}
	reader, err := backend.ListSecrets(app, stage)
	if err != nil {
		return nil, err
	}
	if reader == nil {
		return data, nil
	}
	passphrase, err := Passphrase(backend, app, stage)
	if err != nil {
		return nil, err
	}
	passphraseBytes, err := base64.StdEncoding.DecodeString(passphrase)
	if err != nil {
		return nil, err
	}
	blockCipher, err := aes.NewCipher(passphraseBytes)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(blockCipher)
	if err != nil {
		return nil, err
	}

	encryptedData, err := io.ReadAll(reader)
	if err != nil {
		return nil, err
	}

	nonce, ciphertext := encryptedData[:gcm.NonceSize()], encryptedData[gcm.NonceSize():]

	decrypted, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(decrypted, &data)
	if err != nil {
		return nil, err
	}
	return data, err
}
