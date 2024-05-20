package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	Name     string  `json:"name"`
	Username string  `gorm:"unique" json:"username"`
	Password string  `json:"password"`
	Tokens   []Token `json:"tokens"`
}
