package db

import (
	"strconv"
	"time"
)

func Notes() map[string]map[string]string {
	return map[string]map[string]string{
		"id1": {
			"noteId":    "id1",
			"userId":    "user1",
			"content":   "Hello World!",
			"createdAt": strconv.FormatInt(time.Now().Unix(), 10),
		},
		"id2": {
			"noteId":    "id2",
			"userId":    "user2",
			"content":   "Hello Old World!",
			"createdAt": strconv.FormatInt(time.Now().Unix()-1000, 10),
		},
	}
}
