package main

import (
	"bytes"
	"log"
	"os"
	"strings"

	_ "embed"

	txtTemplate "text/template"

	"github.com/barelyhuman/go/env"
	"github.com/barelyhuman/minweb.site/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

//go:embed review.tmpl.md
var reviewTemplateString string

var DB *gorm.DB

func main() {
	DB = InitDatabase()
	linkData := GetLinks("")
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

func GetLinks(searchTerm string) []models.Site {
	linkData := []models.Site{}
	if len(searchTerm) > 0 {
		searchTermNormalized := strings.Join(strings.Split(strings.ToLower(searchTerm), " "), "%")
		DB.Where("title like ?", "%"+searchTermNormalized+"%").Or("link like ?", "%"+searchTermNormalized+"%").Find(&linkData)
	} else {
		DB.Find(&linkData)
	}
	return linkData
}
