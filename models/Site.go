package models

import "gorm.io/gorm"

type Site struct {
	gorm.Model
	Title           string `json:"title"`
	Link            string `gorm:"unique" json:"link"`
	Category        string `json:"category"`
	ImageURL        string `json:"imageURL"`
	BackgroundColor string `json:"backgroundColor"`
	Slug            string
}
