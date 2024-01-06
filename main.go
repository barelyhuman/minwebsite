//go:generate npm run build
//go:generate go run ./bin/prepare.go

package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/barelyhuman/minwebsite/models"
	modules "github.com/barelyhuman/minwebsite/modules"
	"github.com/jmoiron/sqlx"
	"github.com/lithammer/fuzzysearch/fuzzy"

	_ "github.com/mattn/go-sqlite3"

	"github.com/barelyhuman/go/env"
	"github.com/joho/godotenv"
	"github.com/julienschmidt/httprouter"
)

//go:embed links.json templates/*.html templates/**/*.html assets/*
var sourceData embed.FS

func bail(err error) {
	if err != nil {
		panic(err)
	}
}

type Categories []string

type RenderResponse struct {
	Links      []models.Links
	LinkCount  int
	Categories Categories
}

type App struct {
	Port       string
	Templates  *template.Template
	FS         *embed.FS
	Links      []models.Links
	Categories Categories
	FileServer http.Handler
	DB         *sqlx.DB
}

func main() {
	app := App{}
	app.configure()

	db, err := sqlx.Connect("sqlite3", "dev.sqlite3")
	if err != nil {
		bail(err)
	}

	bail(db.Ping())

	app.DB = db
	app.Links = app.fetchAllLinks()

	app.Categories = GetCategories(app.Links)

	router := httprouter.New()

	app.Templates, err = template.ParseFS(sourceData, "templates/**/*.html")
	bail(err)

	app.Templates, err = app.Templates.ParseFS(sourceData, "templates/*.html")
	bail(err)

	app.FileServer = http.FileServer(http.FS(sourceData))

	router.GET("/", IndexHandler(&app))
	router.GET("/about", AboutHandler(&app))
	router.GET("/admin", AdminGetHandler(&app))
	router.GET("/category/:category", CategoryHandler(&app))
	router.GET("/assets/*assetPath", AssetHandler(&app))

	app.startWorkers()

	fmt.Printf("Listening on %v\n", app.Port)
	http.ListenAndServe(app.Port, router)
}

func (app *App) fetchAllLinks() []models.Links {
	dbLinks := []models.Links{}

	app.DB.Select(&dbLinks, `select id,title,link,category,image_url from links`)

	return dbLinks
}

func (app *App) startWorkers() {
	go app.seedLinks()

	ticker := time.NewTicker(10 * time.Second)
	quit := make(chan struct{})
	go func() {
		for {
			select {
			case <-ticker.C:
				go app.refresh()
			case <-quit:
				ticker.Stop()
				return
			}
		}
	}()
}

func (app *App) configure() {
	godotenv.Load()
	port := env.Get("PORT", "3000")
	app.Port = strings.Join([]string{":", port}, "")
}

func IndexHandler(app *App) func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		search := r.URL.Query().Get("q")

		links := FuzzyResult(search, app.Links)

		app.Templates.ExecuteTemplate(w, "Index", RenderResponse{
			Links:      links,
			LinkCount:  len(links),
			Categories: app.Categories,
		})
	}
}

func CategoryHandler(app *App) func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		category := p.ByName("category")
		search := r.URL.Query().Get("q")

		if category == "all" {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}

		byCategory := []models.Links{}

		for _, lg := range app.Links {
			if lg.Category != category {
				continue
			}
			byCategory = append(byCategory, lg)
		}

		byCategory = FuzzyResult(search, byCategory)

		app.Templates.ExecuteTemplate(w, "Index", RenderResponse{
			Links:      byCategory,
			LinkCount:  len(byCategory),
			Categories: app.Categories,
		})
	}
}

func AboutHandler(app *App) func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		app.Templates.ExecuteTemplate(w, "About", map[string]interface{}{
			"LinkCount":  len(app.Links),
			"Categories": app.Categories,
		})
	}
}

func AssetHandler(app *App) func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		app.FileServer.ServeHTTP(w, r)
	}
}

func AdminGetHandler(app *App) func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		app.Templates.ExecuteTemplate(w, "AdminHome",
			map[string]interface{}{
				"LinkCount":  len(app.Links),
				"Categories": app.Categories,
			})
	}
}

func GetCategories(links []models.Links) Categories {
	categoryMap := map[string]int{}
	categories := Categories{
		"all",
	}

	for _, i := range links {
		if categoryMap[i.Category] > 0 {
			continue
		}
		categoryMap[i.Category] = 1
	}

	for key := range categoryMap {
		categories = append(categories, key)
	}

	return categories
}

func FuzzyResult(search string, links []models.Links) (result []models.Links) {
	if len(search) > 0 {
		for _, lg := range links {
			matchedTitle := fuzzy.Match(strings.ToLower(search), strings.ToLower(lg.Title))
			matchedLink := fuzzy.Match(strings.ToLower(search), strings.ToLower(lg.Link))
			if matchedTitle || matchedLink {
				result = append(result, lg)
			}
		}
	} else {
		result = links
	}

	return
}

func (app *App) refresh() {
	app.Links = app.fetchAllLinks()

	for _, linkItem := range app.Links {
		newLink := modules.ParseMeta(linkItem.Link, linkItem.Title)

		if newLink == linkItem.ImageURL {
			continue
		}

		linkItem.ImageURL = newLink

		_, err := app.DB.Exec(`update links set image_url = ? where id = ?`, linkItem.ImageURL, linkItem.ID)
		if err != nil {
			fmt.Printf("err: %v\n", err)
			continue
		}
	}
}

func (app *App) seedLinks() {
	fileBuff, _ := sourceData.ReadFile("links.json")
	links := []models.Links{}
	json.Unmarshal(fileBuff, &links)

	for _, lg := range links {
		dbLink := []models.Links{}
		err := app.DB.Select(&dbLink, `select id,title,link,category from links where link=?`, lg.Link)
		if err != nil {
			fmt.Printf("err: %v\n", err)
			continue
		}
		fmt.Printf("dbLink: %v\n", dbLink)

		if len(dbLink) == 0 || dbLink[0].ID == 0 {
			_, err := app.DB.Exec(`insert into links (title,link,category) values (?,?,?)`, lg.Title, lg.Link, lg.Category)
			if err != nil {
				log.Println("failed to insert", lg.Title, lg.Link, lg.Category)
			}
		}
	}
}
