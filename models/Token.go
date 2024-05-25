package models

import (
	"time"

	"gorm.io/gorm"
)

type Token struct {
	gorm.Model
	Token     string    `gorm:"unique" json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
	UserID    uint
}
