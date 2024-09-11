package common

type Links map[string]Link

type Link struct {
	Type       string                 `json:"type"`
	Properties map[string]interface{} `json:"properties"`
	Include    []LinkInclude          `json:"include"`
}

type LinkInclude struct {
	Type  string                 `json:"type"`
	Other map[string]interface{} `json:"-"`
}
