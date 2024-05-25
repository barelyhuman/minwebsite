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
	"path/filepath"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/barelyhuman/go/env"
	"github.com/barelyhuman/go/front"
	"github.com/barelyhuman/minweb.site/models"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/yuin/goldmark"
	"golang.org/x/crypto/bcrypt"

	"github.com/go-co-op/gocron/v2"
	"github.com/gorilla/sessions"
	"github.com/joho/godotenv"
	glog "github.com/labstack/gommon/log"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

//go:embed static
var static embed.FS

//go:embed content/*.md
var contentFS embed.FS

//go:embed views/*
var views embed.FS

const ErrorType = "error"

var DB *gorm.DB
var FlashMessages *FlashMessage

func main() {
	godotenv.Load()

	scheduler, err := gocron.NewScheduler()
	if err != nil {
		log.Fatal(err)
	}

	DB = InitDatabase()
	fmt.Println("Migrated database")

	FlashMessages = NewFlashMessageContainer()

	e := echo.New()

	e.RouteNotFound("*", func(c echo.Context) error {
		return c.Render(http.StatusOK, "notFoundPage", struct {
			ErrorFlashes []string
		}{
			ErrorFlashes: FlashMessages.GetAll(c, "error"),
		})
	})

	e.Logger.SetLevel(glog.INFO)

	if env.Get("APP_ENV", "development") == "development" {
		e.Use(middleware.Logger())
		e.Use(middleware.Recover())
	}

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
	e.GET("/", createHomePageHandler())

	adminGroupMux := e.Group("/admin")

	adminGroupMux.Use(
		middleware.KeyAuthWithConfig(
			middleware.KeyAuthConfig{
				KeyLookup: "header:Authorization,cookie:auth",
				ErrorHandler: func(err error, c echo.Context) error {
					FlashMessages.Add(c, ErrorType, "You aren't allowed access this route")
					c.Redirect(http.StatusSeeOther, "/404")
					return err
				},
				Validator: func(key string, c echo.Context) (bool, error) {
					dbToken := &models.Token{}
					DB.Where(&models.Token{Token: key}).First(dbToken)

					if dbToken.Token == "" {
						c.Redirect(http.StatusSeeOther, "/")
						return false, nil
					}

					if dbToken.ExpiresAt.Before(time.Now()) {
						c.Redirect(http.StatusSeeOther, "/")
						return false, nil
					}

					currentUser := &models.User{}
					DB.Where("id=?", dbToken.UserID).Select("id", "username").First(currentUser)
					fmt.Printf("currentUser: %v\n", currentUser)
					c.Set("currentUser", currentUser)

					return true, nil
				},
			},
		),
	)

	adminGroupMux.GET("", adminPage)

	addJobs(scheduler)
	syncLinks()
	scheduler.Start()

	writeRouteManifest(e)
	gracefulShutdown(e)
	scheduler.Shutdown()
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
			if err := e.Start(getPort()); err != nil && err != http.ErrServerClosed {
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
		if err := e.Start(getPort()); err != nil && err != http.ErrServerClosed {
			e.Logger.Fatal("shutting down the server with err", err)
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
		ErrorFlashes []string
		CSRFToken    interface{}
		Error        string
	}{
		ErrorFlashes: FlashMessages.GetAll(c, ErrorType),
		CSRFToken:    c.Get("csrf"),
		Error:        c.QueryParam("error"),
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
	c.Redirect(http.StatusSeeOther, "/admin")
	return nil
}

func reviewPage(c echo.Context) error {
	slugHash := c.Param("hash")
	pathToRead := filepath.Join("content", slugHash+".md")
	fileData, _ := contentFS.ReadFile(pathToRead)

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
			Title        string
			Link         string
			Content      template.HTML
			ErrorFlashes []string
		}{
			Title:        meta.Title,
			Link:         meta.Link,
			Content:      template.HTML(buff.Bytes()),
			ErrorFlashes: FlashMessages.GetAll(c, ErrorType),
		})

	return nil
}

func createHomePageHandler() func(c echo.Context) error {
	return func(c echo.Context) error {
		categories := getCategories()
		searchTerm := c.QueryParam("q")
		linkData := getLinks(searchTerm)

		return c.Render(200, "home", struct {
			ErrorFlashes []string
			Links        []models.Site
			Categories   []string
		}{
			ErrorFlashes: FlashMessages.GetAll(c, ErrorType),
			Links:        linkData,
			Categories:   categories,
		})
	}
}

func aboutPage(c echo.Context) error {
	return c.Render(http.StatusOK, "about", struct {
		ErrorFlashes []string
	}{
		ErrorFlashes: FlashMessages.GetAll(c, ErrorType),
	})
}

func adminPage(c echo.Context) error {
	return c.Render(http.StatusOK, "admin", struct {
		ErrorFlashes []string
	}{
		ErrorFlashes: FlashMessages.GetAll(c, ErrorType),
	})
}

type EchoRenderer struct {
	templates *template.Template
}

func (t *EchoRenderer) Render(w io.Writer, name string, data interface{}, c echo.Context) error {
	return t.templates.ExecuteTemplate(w, name, data)
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
		&models.User{},
		&models.Site{}); err != nil {
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

type FlashMessage struct {
	flashStore *sessions.CookieStore
}

func NewFlashMessageContainer() *FlashMessage {
	return &FlashMessage{
		flashStore: sessions.NewCookieStore(
			[]byte(env.Get("SECURE_COOKIE_SECRET", "super-secret")),
		),
	}
}

func (fm *FlashMessage) Add(c echo.Context, msgType, message string) {
	store, _ := fm.flashStore.Get(c.Request(), msgType)
	store.AddFlash(message)
	err := store.Save(c.Request(), c.Response())
	if err != nil {
		fmt.Printf("err: %v\n", err)
	}
}

func (fm *FlashMessage) GetAll(c echo.Context, msgType string) (result []string) {
	store, err := fm.flashStore.Get(c.Request(), msgType)

	if err != nil {
		fmt.Printf("err: %v\n", err)
	}

	messages := store.Flashes()
	if len(messages) == 0 {
		return
	}

	store.Save(c.Request(), c.Response())
	for _, fl := range messages {
		result = append(result, fl.(string))
	}

	return
}

func writeRouteManifest(e *echo.Echo) {
	sortedRoutes := e.Routes()
	slices.SortFunc(sortedRoutes, func(a *echo.Route, b *echo.Route) int {
		return strings.Compare(a.Name, b.Name)
	})

	data, _ := json.MarshalIndent(sortedRoutes, "", "  ")
	os.WriteFile("routes.json", data, 0644)
}

func syncLinks() {
	links := loadMinWebJSON()

	for _, link := range links {
		newSite := models.Site{}
		newSite.Title = link.Title
		newSite.Link = link.Link
		newSite.Category = link.Category
		newSite.ImageURL = link.ImageURL
		newSite.BackgroundColor = link.BackgroundColor
		newSite.Slug = link.Slug

		existing := new(models.Site)
		DB.Where(models.Site{
			Link: link.Link,
		}).Attrs(newSite).FirstOrCreate(&existing)
	}
}

func addJobs(s gocron.Scheduler) {
	s.NewJob(
		gocron.DurationJob(
			20*time.Second,
		),
		gocron.NewTask(
			syncLinks,
		),
	)
}

func getLinks(searchTerm string) []models.Site {
	linkData := []models.Site{}
	if len(searchTerm) > 0 {
		searchTermNormalized := strings.Join(strings.Split(strings.ToLower(searchTerm), " "), "%")
		DB.Where("title like ?", "%"+searchTermNormalized+"%").Or("link like ?", "%"+searchTermNormalized+"%").Find(&linkData)
	} else {
		DB.Find(&linkData)
	}
	return linkData
}

func getCategories() []string {
	linkData := []models.Site{}
	DB.Select("category").Group("category").Find(&linkData)

	var categories []string
	for _, i := range linkData {
		categories = append(categories, i.Category)
	}
	return categories
}

func getPort() string {
	prefix := []byte(":")
	port := []byte(env.Get("PORT", ":4532"))
	port = bytes.TrimPrefix(port, prefix)
	var buff bytes.Buffer
	buff.Write(prefix)
	buff.Write(port)
	return buff.String()
}
