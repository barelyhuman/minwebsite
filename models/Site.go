package models

import "gorm.io/gorm"

type Site struct {
	gorm.Model
	Title           string `gorm:"index:idx_name_link" json:"title"`
	Link            string `gorm:"index:idx_name_link,unique" json:"link"`
	Category        string `json:"category"`
	ImageURL        string `json:"imageURL"`
	BackgroundColor string `json:"backgroundColor"`
	Slug            string
}
