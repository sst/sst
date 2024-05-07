package npm

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
)

type Package struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

func Get(name string, version string) (*Package, error) {
	slog.Info("getting package", "name", name, "version", version)
	url := "https://registry.npmjs.org/" + name + "/" + version
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch package: %s", resp.Status)
	}
	var data Package
	err = json.NewDecoder(resp.Body).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}
