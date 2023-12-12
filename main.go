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
	"github.com/julienschmidt/httprouter"
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
	Port       string
	Templates  *template.Template
	Links      []modules.LinkGroup
	FileServer http.Handler
}

func main() {
	app := App{}
	app.configure()

	fileBuff, err := os.ReadFile("links.out.json")
	bail(err)

	json.Unmarshal(fileBuff, &app.Links)

	router := httprouter.New()

	app.Templates, err = template.ParseFS(sourceData, "templates/**/*.html")
	bail(err)

	app.Templates, err = app.Templates.ParseFS(sourceData, "templates/*.html")
	bail(err)

	app.FileServer = http.FileServer(http.FS(sourceData))

	router.GET("/", IndexHandler(&app))
	router.GET("/about", AboutHandler(&app))
	router.GET("/assets/*assetPath", AssetHandler(&app))

	fmt.Printf("Listening on %v\n", app.Port)
	http.ListenAndServe(app.Port, router)
}

func (app *App) configure() {
	godotenv.Load()
	port := env.Get("PORT", "3000")
	app.Port = strings.Join([]string{":", port}, "")
}

func IndexHandler(app *App) func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		app.Templates.ExecuteTemplate(w, "Index", RenderResponse{
			Links:     app.Links,
			LinkCount: len(app.Links),
		})
	}
}

func AboutHandler(app *App) func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		app.Templates.ExecuteTemplate(w, "About", map[string]interface{}{
			"LinkCount": len(app.Links),
		})
	}
}

func AssetHandler(app *App) func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		app.FileServer.ServeHTTP(w, r)
	}
}
