package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/barelyhuman/go/env"
	"github.com/gorilla/mux"
)

type LinkItem struct {
	Title           string `json:"title"`
	Link            string `json:"link"`
	Category        string `json:"category"`
	ImageURL        string `json:"imageURL"`
	BackgroundColor string `json:"backgroundColor"`
}

type LinksJSON struct {
	File struct {
		Contents string
	}
}

//go:embed all:client/dist
var StaticFiles embed.FS

type spaHandler struct {
	fileSystem fs.FS
	staticPath string
	indexPath  string
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := filepath.Join(h.staticPath, r.URL.Path)
	fi, err := fs.Stat(h.fileSystem, path)
	subFs, _ := fs.Sub(h.fileSystem, h.staticPath)

	if os.IsNotExist(err) || fi.IsDir() {
		fi, err := fs.Stat(h.fileSystem, filepath.Join(path, "index.html"))
		if os.IsNotExist(err) || fi.IsDir() {
			file, _ := subFs.Open(h.indexPath)
			io.Copy(w, file)
			return
		}
		path = filepath.Join(path, "index.html")
	}

	fmt.Printf("path: %v\n", path)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.FileServer(http.FS(subFs)).ServeHTTP(w, r)
}

func main() {
	router := mux.NewRouter()

	router.HandleFunc("/api/links", LinksHandler)

	spa := spaHandler{fileSystem: StaticFiles, staticPath: "client/dist", indexPath: "index.html"}

	router.PathPrefix("/").Handler(spa)
	port := env.Get("PORT", "3000")
	srv := &http.Server{
		Handler:      router,
		Addr:         "127.0.0.1:" + port,
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}

func LinksHandler(w http.ResponseWriter, r *http.Request) {
	var data LinksJSON
	var buf bytes.Buffer
	var linkData []LinkItem

	response, err := http.Get("https://ungh.cc/repos/barelyhuman/minweb-public-data/files/main/data/links.json")

	if err != nil {
		fmt.Printf("err: %v\n", err)
		// return c.JSON(http.StatusOK, "{}")
	}

	io.Copy(&buf, response.Body)
	json.Unmarshal(buf.Bytes(), &data)
	json.Unmarshal([]byte(data.File.Contents), &linkData)

	filtered := []LinkItem{}
	categories := r.URL.Query()["category"]
	q := r.URL.Query()["q"]

	searchTerm := ""
	if len(q) > 0 {
		searchTerm = strings.ToLower(q[0])
	}

	allCategories := NewStringSet()

	for _, item := range linkData {
		allCategories.Add(item.Category)

		isItemInCategory := false

		if len(categories) == 0 {
			isItemInCategory = true
		}

		for _, v := range categories {
			if strings.Contains(strings.ToLower(v), strings.ToLower(item.Category)) {
				isItemInCategory = true
			}
		}

		if len(searchTerm) == 0 {
			if isItemInCategory {
				filtered = append(filtered, item)
			}
		} else {
			titleLower := strings.ToLower(item.Title)
			linkLower := strings.ToLower(item.Link)
			matchesSearch := (strings.Contains(titleLower, searchTerm) || strings.Contains(linkLower, searchTerm))
			if matchesSearch && isItemInCategory {
				filtered = append(filtered, item)
			}
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"total":      len(linkData),
		"data":       filtered,
		"categories": allCategories.JSON(),
	})

}
