package provider

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"os"
	"time"

	"github.com/sst/ion/pkg/flag"
	"golang.org/x/exp/slog"
	"golang.org/x/sync/errgroup"
)

type Home interface {
	Bootstrap() error
	getData(key, app, stage string) (io.Reader, error)
	putData(key, app, stage string, data io.Reader) error
	removeData(key, app, stage string) error
	setPassphrase(app, stage string, passphrase string) error
	getPassphrase(app, stage string) (string, error)
}

type DevTransport struct {
	In  chan string
	Out chan string
}

type Provider interface {
	Init(app string, stage string, args map[string]interface{}) error
	Env() (map[string]string, error)
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

type DevSession interface {
	Cleanup() error
	Publish(json string) error
}

const SSM_NAME_BOOTSTRAP = "/sst/bootstrap"

var ErrLockExists = fmt.Errorf("Concurrent update detected, run `sst unlock` to delete lock file and retry.")

var passphraseCache = map[Home]map[string]string{}

func Passphrase(backend Home, app, stage string) (string, error) {
	slog.Info("getting passphrase", "app", app, "stage", stage)

	cache, ok := passphraseCache[backend]
	if !ok {
		cache = map[string]string{}
		passphraseCache[backend] = cache
	}

	existingPassphrase, ok := cache[app+stage]
	if ok {
		return existingPassphrase, nil
	}

	passphrase, err := backend.getPassphrase(app, stage)
	if err != nil {
		return "", err
	}

	if passphrase == "" {
		slog.Info("passphrase not found, setting passphrase", "app", app, "stage", stage)
		passphrase = flag.SST_PASSPHRASE
		if passphrase == "" {
			bytes := make([]byte, 32)
			_, err := rand.Read(bytes)
			if err != nil {
				return "", err
			}
			passphrase = base64.StdEncoding.EncodeToString(bytes)
		}
		err = backend.setPassphrase(app, stage, passphrase)
		if err != nil {
			return "", err
		}
	}

	existingPassphrase, ok = cache[app+stage]
	return passphrase, nil
}

func GetLinks(backend Home, app, stage string) (map[string]interface{}, error) {
	data := map[string]interface{}{}
	err := getData(backend, "link", app, stage, true, &data)
	if err != nil {
		return nil, err
	}
	return data, err
}

type Summary struct {
	Version         string         `json:"version"`
	UpdateID        string         `json:"updateID"`
	TimeStarted     string         `json:"timeStarted"`
	TimeCompleted   string         `json:"timeCompleted"`
	ResourceUpdated int            `json:"resourceUpdated"`
	ResourceCreated int            `json:"resourceCreated"`
	ResourceDeleted int            `json:"resourceDeleted"`
	ResourceSame    int            `json:"resourceSame"`
	Errors          []SummaryError `json:"errors"`
}

type SummaryError struct {
	URN     string `json:"urn"`
	Message string `json:"message"`
}

func PutLinks(backend Home, app, stage string, data map[string]interface{}) error {
	slog.Info("putting links", "app", app, "stage", stage)
	if data == nil || len(data) == 0 {
		return nil
	}
	return putData(backend, "link", app, stage, true, data)
}

func PutSummary(backend Home, app, stage, updateID string, summary Summary) error {
	slog.Info("putting summary", "app", app, "stage", stage)
	return putData(backend, "summary", app, stage+"/"+updateID, false, summary)

}

func GetSecrets(backend Home, app, stage string) (map[string]string, error) {
	data := map[string]string{}
	err := getData(backend, "secret", app, stage, true, &data)
	if err != nil {
		return nil, err
	}
	return data, err
}

func PutSecrets(backend Home, app, stage string, data map[string]string) error {
	slog.Info("putting secrets", "app", app, "stage", stage)
	if data == nil {
		return nil
	}
	return putData(backend, "secret", app, stage, true, data)
}

func PushState(backend Home, updateID string, app, stage string, from string) error {
	slog.Info("pushing state", "app", app, "stage", stage, "from", from)
	file, err := os.Open(from)
	if err != nil {
		return nil
	}
	var group errgroup.Group
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return err
	}
	group.Go(func() error {
		return backend.putData("app", app, stage, bytes.NewReader(fileBytes))
	})
	group.Go(func() error {
		prefix := fmt.Sprintf("%020d", math.MaxInt64-time.Now().Unix())
		return backend.putData("history", app, stage+"/"+prefix+"-"+updateID, bytes.NewReader(fileBytes))
	})
	return group.Wait()
}

var ErrStateNotFound = fmt.Errorf("state not found")

func PullState(backend Home, app, stage string, out string) error {
	slog.Info("pulling state", "app", app, "stage", stage, "out", out)
	reader, err := backend.getData("app", app, stage)
	if err != nil {
		return err
	}
	if reader == nil {
		return ErrStateNotFound
	}
	file, err := os.Create(out)
	if err != nil {
		return err
	}
	defer file.Close()
	_, err = io.Copy(file, reader)
	if err != nil {
		return err
	}
	return nil
}

type lockData struct {
	Created  time.Time `json:"created"`
	UpdateID string    `json:"updateID"`
	RunID    string    `json:"runID"`
	Command  string    `json:"command"`
}

func Lock(backend Home, updateID, command, app, stage string) error {
	slog.Info("locking", "app", app, "stage", stage)
	var lockData lockData
	err := getData(backend, "lock", app, stage, false, &lockData)
	if err != nil {
		return err
	}
	if !lockData.Created.IsZero() {
		return ErrLockExists
	}
	lockData.RunID = os.Getenv("SST_RUN_ID")
	lockData.Created = time.Now()
	lockData.UpdateID = updateID
	lockData.Command = command
	err = putData(backend, "lock", app, stage, false, lockData)
	if err != nil {
		return err
	}
	return nil
}

func Unlock(backend Home, app, stage string) error {
	slog.Info("unlocking", "app", app, "stage", stage)
	return removeData(backend, "lock", app, stage)
}

func putData(backend Home, key, app, stage string, encrypt bool, data interface{}) error {
	slog.Info("putting data", "key", key, "app", app, "stage", stage)
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		return err
	}
	if encrypt {
		passphrase, err := Passphrase(backend, app, stage)
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
		jsonBytes = gcm.Seal(nonce, nonce, jsonBytes, nil)
	}
	return backend.putData(key, app, stage, bytes.NewReader(jsonBytes))
}

func getData(backend Home, key, app, stage string, encrypted bool, out interface{}) error {
	slog.Info("getting data", "key", key, "app", app, "stage", stage)
	reader, err := backend.getData(key, app, stage)
	if err != nil {
		return err
	}
	if reader == nil {
		return nil
	}

	data, err := io.ReadAll(reader)
	if err != nil {
		return err
	}

	if encrypted {
		passphrase, err := Passphrase(backend, app, stage)
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

		nonce, ciphertext := data[:gcm.NonceSize()], data[gcm.NonceSize():]

		data, err = gcm.Open(nil, nonce, ciphertext, nil)
		if err != nil {
			return err
		}
	}

	return json.Unmarshal(data, out)
}

func removeData(backend Home, key, app, stage string) error {
	return backend.removeData(key, app, stage)
}
