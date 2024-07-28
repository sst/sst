package flag

import "os"

var SST_NO_CLEANUP = os.Getenv("SST_NO_CLEANUP") != ""
