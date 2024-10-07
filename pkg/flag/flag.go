package flag

import (
	"os"
)

var SST_NO_CLEANUP = os.Getenv("SST_NO_CLEANUP") != ""
var SST_PASSPHRASE = os.Getenv("SST_PASSPHRASE")
var SST_PULUMI_PATH = os.Getenv("SST_PULUMI_PATH")
var SST_PRINT_LOGS = os.Getenv("SST_PRINT_LOGS") != ""
var SST_BUILD_CONCURRENCY = os.Getenv("SST_BUILD_CONCURRENCY")
var SST_SKIP_DEPENDENCY_CHECK = os.Getenv("SST_SKIP_DEPENDENCY_CHECK") != ""
var SST_TELEMETRY_DISABLED = os.Getenv("SST_TELEMETRY_DISABLED") == "1" || os.Getenv("DO_NOT_TRACK") == "1"
var NO_BUN = os.Getenv("NO_BUN") != ""
