package cloudflare

type TailEvent struct {
	DiagnosticsChannelEvents []any `json:"diagnosticsChannelEvents"`
	Event                    struct {
		Request struct {
			Cf struct {
				AsOrganization             string `json:"asOrganization"`
				Asn                        int    `json:"asn"`
				City                       string `json:"city"`
				ClientAcceptEncoding       string `json:"clientAcceptEncoding"`
				Colo                       string `json:"colo"`
				Continent                  string `json:"continent"`
				Country                    string `json:"country"`
				EdgeRequestKeepAliveStatus int    `json:"edgeRequestKeepAliveStatus"`
				HTTPProtocol               string `json:"httpProtocol"`
				Latitude                   string `json:"latitude"`
				Longitude                  string `json:"longitude"`
				MetroCode                  string `json:"metroCode"`
				PostalCode                 string `json:"postalCode"`
				Region                     string `json:"region"`
				RegionCode                 string `json:"regionCode"`
				RequestPriority            string `json:"requestPriority"`
				Timezone                   string `json:"timezone"`
				TLSCipher                  string `json:"tlsCipher"`
				TLSClientAuth              struct {
					CertFingerprintSHA1   string `json:"certFingerprintSHA1"`
					CertFingerprintSHA256 string `json:"certFingerprintSHA256"`
					CertIssuerDN          string `json:"certIssuerDN"`
					CertIssuerDNLegacy    string `json:"certIssuerDNLegacy"`
					CertIssuerDNRFC2253   string `json:"certIssuerDNRFC2253"`
					CertIssuerSKI         string `json:"certIssuerSKI"`
					CertIssuerSerial      string `json:"certIssuerSerial"`
					CertNotAfter          string `json:"certNotAfter"`
					CertNotBefore         string `json:"certNotBefore"`
					CertPresented         string `json:"certPresented"`
					CertRevoked           string `json:"certRevoked"`
					CertSKI               string `json:"certSKI"`
					CertSerial            string `json:"certSerial"`
					CertSubjectDN         string `json:"certSubjectDN"`
					CertSubjectDNLegacy   string `json:"certSubjectDNLegacy"`
					CertSubjectDNRFC2253  string `json:"certSubjectDNRFC2253"`
					CertVerified          string `json:"certVerified"`
				} `json:"tlsClientAuth"`
				TLSClientExtensionsSha1  string `json:"tlsClientExtensionsSha1"`
				TLSClientHelloLength     string `json:"tlsClientHelloLength"`
				TLSClientRandom          string `json:"tlsClientRandom"`
				TLSExportedAuthenticator struct {
					ClientFinished  string `json:"clientFinished"`
					ClientHandshake string `json:"clientHandshake"`
					ServerFinished  string `json:"serverFinished"`
					ServerHandshake string `json:"serverHandshake"`
				} `json:"tlsExportedAuthenticator"`
				TLSVersion          string `json:"tlsVersion"`
				VerifiedBotCategory string `json:"verifiedBotCategory"`
			} `json:"cf"`
			Headers struct {
				Accept                  string `json:"accept"`
				AcceptEncoding          string `json:"accept-encoding"`
				AcceptLanguage          string `json:"accept-language"`
				CfConnectingIP          string `json:"cf-connecting-ip"`
				CfIpcountry             string `json:"cf-ipcountry"`
				CfRay                   string `json:"cf-ray"`
				CfVisitor               string `json:"cf-visitor"`
				Connection              string `json:"connection"`
				Host                    string `json:"host"`
				Priority                string `json:"priority"`
				SecChUa                 string `json:"sec-ch-ua"`
				SecChUaMobile           string `json:"sec-ch-ua-mobile"`
				SecChUaPlatform         string `json:"sec-ch-ua-platform"`
				SecFetchDest            string `json:"sec-fetch-dest"`
				SecFetchMode            string `json:"sec-fetch-mode"`
				SecFetchSite            string `json:"sec-fetch-site"`
				SecFetchUser            string `json:"sec-fetch-user"`
				UpgradeInsecureRequests string `json:"upgrade-insecure-requests"`
				UserAgent               string `json:"user-agent"`
				XForwardedProto         string `json:"x-forwarded-proto"`
				XRealIP                 string `json:"x-real-ip"`
			} `json:"headers"`
			Method string `json:"method"`
			URL    string `json:"url"`
		} `json:"request"`
		Response struct {
			Status int `json:"status"`
		} `json:"response"`
	} `json:"event"`
	EventTimestamp int64 `json:"eventTimestamp"`
	Exceptions     []any `json:"exceptions"`
	Logs           []struct {
		Level     string        `json:"level"`
		Message   []interface{} `json:"message"`
		Timestamp int64         `json:"timestamp"`
	} `json:"logs"`
	Outcome       string `json:"outcome"`
	ScriptName    string `json:"scriptName"`
	ScriptVersion struct {
		ID string `json:"id"`
	} `json:"scriptVersion"`
}
