package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"strings"

	"github.com/barelyhuman/go/env"
	"github.com/joho/godotenv"
)

//go:embed list.json index.html assets/*
var sourceData embed.FS

func bail(err error) {
	if err != nil {
		panic(err)
	}
}

type LinkGroup struct {
	Title string
	Link  string
}

type RenderResponse struct {
	Links []LinkGroup
}

type App struct {
	Port string
}

func main() {

	app := App{}
	app.configure()

	fileBuff, err := sourceData.ReadFile("list.json")
	bail(err)

	var linkList []LinkGroup
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
	})

	fmt.Printf("Listening on %v\n", app.Port)
	http.ListenAndServe(app.Port, globalHandler)
}

func (app *App) configure() {

	godotenv.Load()

	port := env.Get("PORT", "3000")
	app.Port = ":" + port
}
