package modules

// import (
// 	"net/http"
// 	"strings"

// 	netHTML "golang.org/x/net/html"
// )

// type ByTitle []LinkGroup

// func (a ByTitle) Len() int      { return len(a) }
// func (a ByTitle) Swap(i, j int) { a[i], a[j] = a[j], a[i] }
// func (a ByTitle) Less(i, j int) bool {
// 	return strings.ToLower(a[i].Title) < strings.ToLower(a[j].Title)
// }

// type LinkGroup struct {
// 	Title    string `json:"title"`
// 	Link     string `json:"link"`
// 	Category string `json:"category"`
// 	Meta     *Meta  `json:"meta"`
// }

// type Meta struct {
// 	Image        string `json:"image"`
// 	UsesFallback bool   `json:"usesFallback"`
// }

// func (link *LinkGroup) ParseMeta() {
// 	res, err := http.Get(link.Link)
// 	if err != nil {
// 		return
// 	}
// 	doc, err := netHTML.Parse(res.Body)
// 	if err != nil {
// 		return
// 	}
// 	headNode, err := Head(doc)
// 	if err != nil {
// 		return
// 	}

// 	link.Meta = &Meta{}
// 	metaImageLink := getOpenGraphImageLink(headNode, link.Link)
// 	if len(metaImageLink) == 0 {
// 		metaImageLink = getFallbackURL(link.Title)
// 		link.Meta.UsesFallback = true
// 	}
// 	link.Meta.Image = metaImageLink
// }
