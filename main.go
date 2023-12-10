package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"

	"github.com/barelyhuman/go/env"
	"github.com/joho/godotenv"

	netHTML "golang.org/x/net/html"
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
	Meta  Meta
}

type Meta struct {
	Image string
}

type RenderResponse struct {
	Links []LinkGroup
}

type App struct {
	Port string
}

func (link *LinkGroup) parseMeta() {
	res, err := http.Get(link.Link)
	if err != nil {
		return
	}
	doc, err := netHTML.Parse(res.Body)
	if err != nil {
		return
	}
	headNode, err := Head(doc)
	if err != nil {
		return
	}

	metaImageLink := getOpenGraphImageLink(headNode, link.Link)
	if len(metaImageLink) == 0 {
		metaImageLink = "https://og.barelyhuman.xyz/generate?fontSize=14&title=" + link.Title + "&fontSizeTwo=8&color=%23000"
	}
	link.Meta.Image = metaImageLink

}

func getOpenGraphImageLink(doc *netHTML.Node, base string) (link string) {
	var crawler func(*netHTML.Node)
	crawler = func(node *netHTML.Node) {
		if node.Type == netHTML.ElementNode && node.Data == "meta" {
			ogImgMeta := false
			ogContent := ""
			for _, a := range node.Attr {
				if a.Key == "property" && a.Val == "og:image" {
					ogImgMeta = true
				}
				if a.Key == "content" {
					ogContent = a.Val
				}
			}
			if ogImgMeta && len(ogContent) > 0 {
				if strings.HasPrefix(ogContent, "/") {
					joinedUrl, err := url.JoinPath(base, ogContent)
					if err == nil {
						ogContent = joinedUrl
					}
				}

				resultUrl, err := url.Parse(ogContent)
				if err != nil {
					return
				}

				requestResponse, err := http.Get(resultUrl.String())
				if err != nil {
					return
				}

				if requestResponse.StatusCode != http.StatusOK {
					return
				}

				link = resultUrl.String()
				return
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			crawler(child)
		}
	}

	crawler(doc)
	return link
}

func Head(doc *netHTML.Node) (bhead *netHTML.Node, err error) {
	var crawler func(*netHTML.Node)

	crawler = func(node *netHTML.Node) {
		if node.Type == netHTML.ElementNode && node.Data == "head" {
			bhead = node
			return
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			crawler(child)
		}
	}

	crawler(doc)

	if bhead != nil {
		return bhead, nil
	}

	return bhead, nil
}

func main() {
	app := App{}
	app.configure()

	fileBuff, err := sourceData.ReadFile("list.json")
	bail(err)

	var linkList []LinkGroup
	json.Unmarshal(fileBuff, &linkList)
	sort.Sort(ByTitle(linkList))

	var wg sync.WaitGroup
	for index := range linkList {
		index := index
		wg.Add(1)
		go func() {
			defer wg.Done()
			linkList[index].parseMeta()
		}()
	}

	wg.Wait()

	templateBuff, err := sourceData.ReadFile("index.html")
	bail(err)

	tmpl, err := template.New("BaseTemplate").Parse(string(templateBuff))
	bail(err)

	var preRenderedHTML bytes.Buffer

	tmpl.Execute(&preRenderedHTML, RenderResponse{
		Links: linkList,
	})

	staticServe := http.FileServer(http.FS(sourceData))

	globalHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" && strings.HasPrefix(r.URL.Path, "/assets") {
			staticServe.ServeHTTP(w, r)
			return
		}

		query := r.URL.Query()
		linkFetch := query.Get("link")
		if len(linkFetch) > 0 {
			resp, err := http.Get(linkFetch)
			if err != nil {
				return
			}
			responseBody, err := (io.ReadAll(resp.Body))
			if err != nil {
				return
			}
			w.Write(responseBody)
		}

		w.Write(preRenderedHTML.Bytes())
	})

	fmt.Printf("Listening on %v\n", app.Port)
	http.ListenAndServe(app.Port, globalHandler)
}

func (app *App) configure() {
	godotenv.Load()
	port := env.Get("PORT", "3000")
	app.Port = strings.Join([]string{":", port}, "")
}

type ByTitle []LinkGroup

func (a ByTitle) Len() int      { return len(a) }
func (a ByTitle) Swap(i, j int) { a[i], a[j] = a[j], a[i] }
func (a ByTitle) Less(i, j int) bool {
	return strings.ToLower(a[i].Title) < strings.ToLower(a[j].Title)
}
