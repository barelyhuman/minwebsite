package main

import (
	"bytes"
	"context"
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/barelyhuman/go/env"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

//go:embed all:client/dist
var StaticFiles embed.FS

func main() {
	e := echo.New()

	devMode := flag.Bool("dev", false, "Enable dev mode")
	flag.Parse()

	if !*devMode {
		distFS := echo.MustSubFS(StaticFiles, "client/dist")
		e.StaticFS("/", distFS)
	} else {
		e.GET("/", func(c echo.Context) error {
			c.Redirect(http.StatusSeeOther, "http://localhost:5173/")
			return nil
		})
	}

	e.Pre(middleware.RemoveTrailingSlash())

	e.GET("/api/links", func(c echo.Context) error {
		var data LinksJSON
		var buf bytes.Buffer
		var linkData []LinkItem

		response, err := http.Get("https://ungh.cc/repos/barelyhuman/minweb-public-data/files/main/data/links.json")

		if err != nil {
			fmt.Printf("err: %v\n", err)
			return c.JSON(http.StatusOK, "{}")
		}

		io.Copy(&buf, response.Body)
		json.Unmarshal(buf.Bytes(), &data)
		json.Unmarshal([]byte(data.File.Contents), &linkData)

		filtered := []LinkItem{}
		categories := c.Request().URL.Query()["category"]
		searchTerm := strings.ToLower(c.QueryParam("q"))

		allCategories := NewSet()

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

		return c.JSON(http.StatusOK, map[string]interface{}{
			"total":      len(linkData),
			"data":       filtered,
			"categories": allCategories.JSON(),
		})
	})

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	go func() {
		port := env.Get("PORT", "3000")
		if err := e.Start(":" + port); err != nil && err != http.ErrServerClosed {
			e.Logger.Fatal("shutting down the server")
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with a timeout of 10 seconds.
	<-ctx.Done()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		e.Logger.Fatal(err)
	}
}

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
