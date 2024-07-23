package tcellterm

import (
	"strings"
)

func (vt *VT) osc(data string) {
	selector, val, found := cutString(data, ";")
	if !found {
		return
	}
	switch selector {
	case "0", "2":
		ev := &EventTitle{
			EventTerminal: newEventTerminal(vt),
			title:         val,
		}
		vt.postEvent(ev)
	case "8":
		if vt.OSC8 {
			url, id := osc8(val)
			vt.cursor.attrs = vt.cursor.attrs.Url(url)
			vt.cursor.attrs = vt.cursor.attrs.UrlId(id)
		}
	}
}

// parses an osc8 payload into the URL and optional ID
func osc8(val string) (string, string) {
	// OSC 8 ; params ; url ST
	// params: key1=value1:key2=value2
	var id string
	params, url, found := cutString(val, ";")
	if !found {
		return "", ""
	}
	for _, param := range strings.Split(params, ":") {
		key, val, found := cutString(param, "=")
		if !found {
			continue
		}
		switch key {
		case "id":
			id = val
		}
	}
	return url, id
}

// Copied from stdlib to here for go 1.16 compat
func cutString(s string, sep string) (before string, after string, found bool) {
	if i := strings.Index(s, sep); i >= 0 {
		return s[:i], s[i+len(sep):], true
	}
	return s, "", false
}
