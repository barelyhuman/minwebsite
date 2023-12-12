//go:generate npm run build

package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"strings"

	modules "github.com/barelyhuman/minwebsite/modules"

	"github.com/barelyhuman/go/env"
	"github.com/joho/godotenv"
)

//go:embed links.out.json index.html assets/*
var sourceData embed.FS

func bail(err error) {
	if err != nil {
		panic(err)
	}
}

type RenderResponse struct {
	Links []modules.LinkGroup
}

type App struct {
	Port string
}

func main() {
	app := App{}
	app.configure()

	fileBuff, err := os.ReadFile("links.out.json")
	bail(err)

	var linkList []modules.LinkGroup
	json.Unmarshal(fileBuff, &linkList)

	templateBuff, err := sourceData.ReadFile("index.html")
	bail(err)

	tmpl, err := template.New("BaseTemplate").Parse(string(templateBuff))
	bail(err)
	staticServe := http.FileServer(http.FS(sourceData))
	globalHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" && strings.HasPrefix(r.URL.Path, "/assets") {
			staticServe.ServeHTTP(w, r)
			return
		}

		tmpl.Execute(w, RenderResponse{
			Links: linkList,
		})
		return
	})

	fmt.Printf("Listening on %v\n", app.Port)
	http.ListenAndServe(app.Port, globalHandler)
}

func (app *App) configure() {
	godotenv.Load()
	port := env.Get("PORT", "3000")
	app.Port = strings.Join([]string{":", port}, "")
}
