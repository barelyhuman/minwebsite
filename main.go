//go:generate npm run build
//go:generate go run ./bin/prepare.go

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

//go:embed links.out.json templates/*.html templates/**/*.html assets/*
var sourceData embed.FS

func bail(err error) {
	if err != nil {
		panic(err)
	}
}

type RenderResponse struct {
	Links     []modules.LinkGroup
	LinkCount int
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

	templateCollection, err := template.ParseFS(sourceData, "templates/**/*.html")
	bail(err)

	templateCollection, err = templateCollection.ParseFS(sourceData, "templates/*.html")
	bail(err)

	staticServe := http.FileServer(http.FS(sourceData))
	globalHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" && strings.HasPrefix(r.URL.Path, "/assets") {
			staticServe.ServeHTTP(w, r)
			return
		}

		if r.URL.Path == "/about" {
			templateCollection.ExecuteTemplate(w, "About", map[string]interface{}{
				"LinkCount": len(linkList),
			})
			return
		}

		templateCollection.ExecuteTemplate(w, "Index", RenderResponse{
			Links:     linkList,
			LinkCount: len(linkList),
		})
	})

	fmt.Printf("Listening on %v\n", app.Port)
	http.ListenAndServe(app.Port, globalHandler)
}

func (app *App) configure() {
	godotenv.Load()
	port := env.Get("PORT", "3000")
	app.Port = strings.Join([]string{":", port}, "")
}
