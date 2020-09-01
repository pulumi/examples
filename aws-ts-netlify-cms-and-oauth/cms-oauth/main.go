package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/pat"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/bitbucket"
	"github.com/markbates/goth/providers/github"
	"github.com/markbates/goth/providers/gitlab"
)

var (
	host = "localhost:3000"
)

const (
	script = `<!DOCTYPE html><html><head><script>
  if (!window.opener) {
    window.opener = {
      postMessage: function(action, origin) {
        console.log(action, origin);
      }
    }
  }
  (function(status, provider, result) {
    function recieveMessage(e) {
      console.log("Recieve message:", e);
      // send message to main window with da app
      window.opener.postMessage(
        "authorization:" + provider + ":" + status + ":" + JSON.stringify(result),
        e.origin
      );
    }
    window.addEventListener("message", recieveMessage, false);
    // Start handshare with parent
    console.log("Sending message:", provider)
    window.opener.postMessage(
      "authorizing:" + provider,
      "*"
    );
  })("%s", "%s", %s)
  </script></head><body></body></html>`
)

// GET /
func handleMain(res http.ResponseWriter, req *http.Request) {
	res.Header().Set("Content-Type", "text/html; charset=utf-8")
	res.WriteHeader(http.StatusOK)
	res.Write([]byte(``))
}

// GET /auth Page  redirecting after provider get param
func handleAuth(res http.ResponseWriter, req *http.Request) {
	url := fmt.Sprintf("%s/auth/%s", host, req.FormValue("provider"))
	fmt.Printf("redirect to %s\n", url)
	http.Redirect(res, req, url, http.StatusTemporaryRedirect)
}

// GET /auth/provider  Initial page redirecting by provider
func handleAuthProvider(res http.ResponseWriter, req *http.Request) {
	gothic.BeginAuthHandler(res, req)
}

// GET /callback/{provider}  Called by provider after authorization is granted
func handleCallbackProvider(res http.ResponseWriter, req *http.Request) {
	var (
		status string
		result string
	)
	provider, errProvider := gothic.GetProviderName(req)
	user, errAuth := gothic.CompleteUserAuth(res, req)
	status = "error"
	if errProvider != nil {
		fmt.Printf("provider failed with '%s'\n", errProvider)
		result = fmt.Sprintf("%s", errProvider)
	} else if errAuth != nil {
		fmt.Printf("auth failed with '%s'\n", errAuth)
		result = fmt.Sprintf("%s", errAuth)
	} else {
		fmt.Printf("Logged in as %s user: %s (%s)\n", user.Provider, user.Email, user.AccessToken)
		status = "success"
		result = fmt.Sprintf(`{"token":"%s", "provider":"%s"}`, user.AccessToken, user.Provider)
	}
	res.Header().Set("Content-Type", "text/html; charset=utf-8")
	res.WriteHeader(http.StatusOK)
	res.Write([]byte(fmt.Sprintf(script, status, provider, result)))
}

// GET /refresh
func handleRefresh(res http.ResponseWriter, req *http.Request) {
	fmt.Printf("refresh with '%s'\n", req)
	res.Write([]byte(""))
}

// GET /success
func handleSuccess(res http.ResponseWriter, req *http.Request) {
	fmt.Printf("success with '%s'\n", req)
	res.Write([]byte(""))
}

func init() {
	// look for environment variable "HOST " we defined in the pulumi
	if hostEnv, ok := os.LookupEnv("HOST"); ok {
		host = hostEnv
	}
	var (
		gitlabProvider goth.Provider
	)
	if gitlabServer, ok := os.LookupEnv("GITLAB_SERVER"); ok {
		gitlabProvider = gitlab.NewCustomisedURL(
			os.Getenv("GITLAB_KEY"), os.Getenv("GITLAB_SECRET"),
			fmt.Sprintf("%s/callback/gitlab", host),
			fmt.Sprintf("https://%s/oauth/authorize", gitlabServer),
			fmt.Sprintf("https://%s/oauth/token", gitlabServer),
			fmt.Sprintf("https://%s/api/v3/user", gitlabServer),
		)
	} else {
		gitlabProvider = gitlab.New(
			os.Getenv("GITLAB_KEY"), os.Getenv("GITLAB_SECRET"),
			fmt.Sprintf("%s/callback/gitlab", host),
		)
	}

	githubScope := os.Getenv("GITHUB_SCOPE")
	if githubScope == "" {
		goth.UseProviders(
			github.New(
				os.Getenv("GITHUB_KEY"), os.Getenv("GITHUB_SECRET"),
				// concatenate with the host name
				fmt.Sprintf("%s/callback/github", host),
				"public_repo",
			),
			bitbucket.New(
				os.Getenv("BITBUCKET_KEY"), os.Getenv("BITBUCKET_SECRET"),
				fmt.Sprintf("%s/callback//bitbucket", host),
			),
			gitlabProvider,
		)
	} else {
		scopeArray := strings.Split(githubScope, ",")
		goth.UseProviders(
			github.New(
				os.Getenv("GITHUB_KEY"), os.Getenv("GITHUB_SECRET"),
				// concatenate with the host name
				fmt.Sprintf("%s/callback/github", host),
				scopeArray...,
			),
			bitbucket.New(
				os.Getenv("BITBUCKET_KEY"), os.Getenv("BITBUCKET_SECRET"),
				fmt.Sprintf("%s/callback//bitbucket", host),
			),
			gitlabProvider,
		)
	}
}

func main() {
	router := pat.New()
	//callack endpoints for github it's /callback/github
	router.Get("/callback/{provider}", handleCallbackProvider)
	router.Get("/auth/{provider}", handleAuthProvider)
	router.Get("/auth", handleAuth)
	router.Get("/refresh", handleRefresh)
	router.Get("/success", handleSuccess)
	router.Get("/", handleMain)
	//
	http.Handle("/", router)
	//
	// if TARGET_PORT is unset or do not present then set it to be port 80
	targetGroupPort := os.Getenv("TARGET_PORT")
	if targetGroupPort == "" {
		targetGroupPort = "80"
	}
	listenPort := ":" + targetGroupPort
	fmt.Print("Started running on", listenPort, "\n")
	// listen on port 80 where we created the target group
	fmt.Println(http.ListenAndServe(listenPort, nil))
}
