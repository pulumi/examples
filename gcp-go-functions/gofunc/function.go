package helloworld

import (
	"fmt"
	"net/http"
)

func Handler(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "text/plain")
	fmt.Fprintf(w, "Hello World!")
}
