// go:generate go run dao/dao.go
package main

import (
	"bytes"
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"slices"
	"sort"
	"strings"
	txtTemplate "text/template"
	"time"

	"github.com/barelyhuman/go/env"
	"github.com/barelyhuman/go/front"
	"github.com/barelyhuman/minweb.site/models"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/yuin/goldmark"
	"golang.org/x/crypto/bcrypt"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

//go:embed static
var static embed.FS

//go:embed resources/review.tmpl.md
var reviewTemplateString string

//go:embed views/*
var views embed.FS

var DB *gorm.DB

func main() {

	fmt.Println("Migrated database")

	DB = InitDatabase()

	linkData := loadMinWebJSON()

	reviewTemplate := txtTemplate.New("reviewTemplate")
	reviewTemplate.Parse(reviewTemplateString)

	os.MkdirAll("./content", os.ModePerm)
	for _, l := range linkData {
		reviewPostPath := "./content/" + l.Slug + ".md"
		_, err := os.Stat(reviewPostPath)
		if err != nil {
			if os.IsNotExist(err) {

				var buff bytes.Buffer

				reviewTemplate.Execute(&buff, struct {
					Title string
					Link  string
				}{
					Title: l.Title,
					Link:  l.Link,
				})

				os.WriteFile(reviewPostPath,
					buff.Bytes(),
					os.ModePerm,
				)
			}
		}
	}

	e := echo.New()

	e.Renderer = &EchoRenderer{
		templates: template.Must(
			template.ParseFS(views, "views/*.html"),
		),
	}

	e.Use(middleware.StaticWithConfig(middleware.StaticConfig{
		HTML5:      true,
		Filesystem: http.FS(static),
	}))

	e.Use(middleware.CORS())
	e.Use(middleware.CSRFWithConfig(
		middleware.CSRFConfig{
			TokenLookup: "form:_csrf",
		},
	))
	e.Pre(middleware.RemoveTrailingSlash())
	e.Use(middleware.GzipWithConfig(middleware.GzipConfig{
		Level: 5,
	}))

	e.Use(middleware.RateLimiterWithConfig(getRatelimiterConfig()))

	e.Use(middleware.SecureWithConfig(middleware.SecureConfig{
		HSTSMaxAge: 3600,
	}))

	e.GET("/login", loginPage)
	e.POST("/login", loginRequest)
	e.GET("/review/:hash", reviewPage)
	e.GET("/about", aboutPage)
	e.GET("/", homePage)

	gracefulShutdown(e)
}

func getRatelimiterConfig() middleware.RateLimiterConfig {
	return middleware.RateLimiterConfig{
		Skipper: middleware.DefaultSkipper,
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{Rate: 10, Burst: 30, ExpiresIn: 3 * time.Minute},
		),
		IdentifierExtractor: func(ctx echo.Context) (string, error) {
			id := ctx.RealIP()
			return id, nil
		},
		ErrorHandler: func(context echo.Context, err error) error {
			return context.JSON(http.StatusForbidden, nil)
		},
		DenyHandler: func(context echo.Context, identifier string, err error) error {
			return context.JSON(http.StatusTooManyRequests, nil)
		},
	}
}

func gracefulShutdown(e *echo.Echo) {
	appEnv := env.Get("APP_ENV", "development")
	if appEnv == "production" {
		ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
		defer stop()
		// Start server
		go func() {
			if err := e.Start(":1323"); err != nil && err != http.ErrServerClosed {
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
	} else {
		if err := e.Start(":1323"); err != nil && err != http.ErrServerClosed {
			e.Logger.Fatal("shutting down the server")
		}
	}
}

type LinksJSON struct {
	File struct {
		Contents string
	}
}

type LinkItem struct {
	Title           string `json:"title"`
	Link            string `json:"link"`
	Category        string `json:"category"`
	ImageURL        string `json:"imageURL"`
	BackgroundColor string `json:"backgroundColor"`
	Slug            string
}

func loginPage(c echo.Context) error {
	return c.Render(http.StatusOK, "login", struct {
		CSRFToken interface{}
		Error     string
	}{
		CSRFToken: c.Get("csrf"),
		Error:     c.QueryParam("error"),
	})
}

func loginRequest(c echo.Context) error {
	username := c.FormValue("username")
	password := c.FormValue("password")

	user := models.User{}

	DB.Where(&models.User{
		Name: username,
	}).First(&user)

	if user.Name == "" {
		c.Redirect(http.StatusSeeOther, "/login?error=invalid credentials")
		return nil
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)) != nil {
		c.Redirect(http.StatusSeeOther, "/login?error=invalid credentials")
		return nil
	}

	token := models.Token{}
	token.ExpiresAt = time.Now().Add(time.Hour * 24)
	token.UserID = user.ID
	token.Token = RandStringBytes(32)
	DB.Save(&token)

	c.SetCookie(&http.Cookie{
		Name:     "auth",
		Value:    token.Token,
		HttpOnly: true,
		Expires:  time.Now().Add(time.Hour * 24),
		SameSite: http.SameSiteLaxMode,
		Secure:   false,
	})
	c.Redirect(http.StatusSeeOther, "/")
	return nil
}

func reviewPage(c echo.Context) error {
	slugHash := c.Param("hash")
	pathToRead := "./content/" + slugHash + ".md"
	_, err := os.Stat("./content/" + slugHash + ".md")
	if err != nil {
		return err
	}

	fileData, _ := os.ReadFile(pathToRead)

	var meta struct {
		Title string
		Link  string
	}

	contents, _ := front.Unmarshal(fileData, &meta)

	var buff bytes.Buffer
	goldmark.Convert(
		[]byte(contents),
		&buff,
	)

	c.Render(http.StatusOK, "review",
		struct {
			Title   string
			Link    string
			Content template.HTML
		}{
			Title:   meta.Title,
			Link:    meta.Link,
			Content: template.HTML(buff.Bytes()),
		})

	return nil
}

func homePage(c echo.Context) error {
	linkData := loadMinWebJSON()
	categories := NewCategorySet()

	for _, l := range linkData {
		categories.Add(l.Category)
	}

	return c.Render(200, "home", struct {
		Links      []LinkItem
		Categories []string
	}{
		Links:      linkData,
		Categories: *categories,
	})
}

func aboutPage(c echo.Context) error {
	return c.Render(http.StatusOK, "about", "Sid")
}

type EchoRenderer struct {
	templates *template.Template
}

func (t *EchoRenderer) Render(w io.Writer, name string, data interface{}, c echo.Context) error {
	return t.templates.ExecuteTemplate(w, name, data)
}

type CategorySet []string

func NewCategorySet() *CategorySet {
	return &CategorySet{}
}

func (cs *CategorySet) onIndex(item string) int {
	for i, l := range *cs {
		if l == item {
			return i
		}
	}
	return -1
}

func (cs *CategorySet) Has(item string) bool {
	hasItem := cs.onIndex(item)
	return hasItem > -1
}

func (cs *CategorySet) Add(item string) {
	if cs.Has(item) {
		return
	}
	*cs = append(*cs, item)
}

func (cs *CategorySet) Delete(item string) {
	if cs.Has(item) {
		return
	}
	index := cs.onIndex(item)
	*cs = slices.Delete(*cs, index, index+1)
}

func loadMinWebJSON() (linkData []LinkItem) {
	response, err := http.Get("https://ungh.cc/repos/barelyhuman/minweb-public-data/files/main/data/links.json")
	if err != nil {
		return
	}

	var buf bytes.Buffer
	var data LinksJSON

	io.Copy(&buf, response.Body)
	json.Unmarshal(buf.Bytes(), &data)
	json.Unmarshal([]byte(data.File.Contents), &linkData)

	sort.Slice(linkData, func(i, j int) bool {
		a := linkData[i]
		b := linkData[j]
		return strings.Compare(a.Title, b.Title) < 0
	})

	for i, l := range linkData {
		linkData[i].Slug = "review-" + fastHash(l.Link)
	}

	return
}

func InitDatabase() *gorm.DB {
	rootUser := env.Get("ROOT_USER", "root")
	rootPassword := env.Get("ROOT_PASSWORD", "root")

	db, err := gorm.Open(sqlite.Open("db.sqlite3"), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
		return nil
	}
	if err := db.AutoMigrate(
		&models.Token{},
		&models.User{}); err != nil {
		panic(err)
	}

	hashedPass, _ := bcrypt.GenerateFromPassword([]byte(rootPassword), bcrypt.DefaultCost)

	var saved models.User
	db.Where(&models.User{
		Name: rootUser,
	}).Attrs(&models.User{
		Name:     rootUser,
		Password: string(hashedPass),
	}).FirstOrInit(&saved).Save(&saved)

	return db
}

const letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

func RandStringBytes(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = letterBytes[rand.Intn(len(letterBytes))]
	}
	return string(b)
}

func fastHash(str string) string {
	var hash int64 = 5381

	for _, strPointer := range str {
		hash = (hash << 5) + hash + int64(strPointer)
	}

	return fmt.Sprintf("%v", hash)
}
