package main

import (
	"encoding/json"
	"os"
	"sort"
	"sync"

	"github.com/barelyhuman/minwebsite/modules"
)

func main() {
	links := []modules.LinkGroup{}
	fileBuff, err := os.ReadFile("./links.json")
	modules.Bail(err)

	json.Unmarshal(fileBuff, &links)
	sort.Sort(modules.ByTitle(links))

	var wg sync.WaitGroup
	for index := range links {
		index := index
		wg.Add(1)
		go func() {
			defer wg.Done()
			links[index].ParseMeta()
		}()
	}

	wg.Wait()

	out, _ := json.Marshal(&links)
	os.WriteFile("links.out.json", out, os.ModePerm)
}
