package main

import (
	"encoding/json"
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"
)

type Data struct {
}

type AuthenticationCreds struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (d *Data) Connect() error {
	os.WriteFile("auth.json", []byte("{}"), os.ModePerm)
	return nil
}

// TODO: move the read and write of auth.json to it's own function
func (d *Data) Authenticate(username string, password string) error {
	var userCreds AuthenticationCreds

	dataBuff, err := os.ReadFile(".minwebinternals/auth.json")

	if err != nil {
		return err
	}

	err = json.Unmarshal(dataBuff, &userCreds)
	if err != nil {
		return err
	}

	// validate user and hashed password

	if bcrypt.CompareHashAndPassword(
		[]byte(userCreds.Password),
		[]byte(password),
	) != nil {
		return fmt.Errorf("invalid credentials")
	}

	return nil
}

func (d *Data) CreateAdmin(username, password string) error {

	hash, err := bcrypt.GenerateFromPassword([]byte(password), 16)
	if err != nil {
		return err
	}

	userCreds := AuthenticationCreds{}
	userCreds.Username = username
	userCreds.Password = string(hash)

	dataBuff, err := json.Marshal(userCreds)
	if err != nil {
		return err
	}

	err = os.WriteFile(".minwebinternals/auth.json", dataBuff, os.ModePerm)
	return err
}
