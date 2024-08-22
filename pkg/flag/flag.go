package flag

import (
	"os"
)

var SST_NO_CLEANUP = os.Getenv("SST_NO_CLEANUP") != ""
var SST_PASSPHRASE = os.Getenv("SST_PASSPHRASE")
var SST_PULUMI_PATH = os.Getenv("SST_PULUMI_PATH")
var SST_PRINT_LOGS = os.Getenv("SST_PRINT_LOGS") != ""
var SST_BUILD_CONCURRENCY = os.Getenv("SST_BUILD_CONCURRENCY")
