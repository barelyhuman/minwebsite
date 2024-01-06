package modules

import (
	"net/http"
	"net/url"
	"strings"

	netHTML "golang.org/x/net/html"
)

func Bail(err error) {
	if err != nil {
		panic(err)
	}
}

func ParseMeta(link string, name string) (metaImageLink string) {
	res, err := http.Get(link)
	if err != nil {
		return
	}
	doc, err := netHTML.Parse(res.Body)
	if err != nil {
		return
	}
	headNode, err := Head(doc)
	if err != nil {
		return
	}

	metaImageLink = getOpenGraphImageLink(headNode, link)
	if len(metaImageLink) == 0 {
		metaImageLink = getFallbackURL(name)
	}
	return metaImageLink
}

func getOpenGraphImageLink(doc *netHTML.Node, base string) (link string) {
	var crawler func(*netHTML.Node)
	crawler = func(node *netHTML.Node) {
		if node.Type == netHTML.ElementNode && node.Data == "meta" {
			ogImgMeta := false
			ogContent := ""
			for _, a := range node.Attr {
				if a.Key == "property" && a.Val == "og:image" {
					ogImgMeta = true
				}
				if a.Key == "content" {
					ogContent = a.Val
				}
			}
			if ogImgMeta && len(ogContent) > 0 {
				if strings.HasPrefix(ogContent, "/") {
					joinedUrl, err := url.JoinPath(base, ogContent)
					if err == nil {
						ogContent = joinedUrl
					}
				}

				resultUrl, err := url.Parse(ogContent)
				if err != nil {
					return
				}

				requestResponse, err := http.Get(resultUrl.String())
				if err != nil {
					return
				}

				if requestResponse.StatusCode != http.StatusOK {
					return
				}

				link = resultUrl.String()
				return
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			crawler(child)
		}
	}

	crawler(doc)
	return link
}

func Head(doc *netHTML.Node) (bhead *netHTML.Node, err error) {
	var crawler func(*netHTML.Node)

	crawler = func(node *netHTML.Node) {
		if node.Type == netHTML.ElementNode && node.Data == "head" {
			bhead = node
			return
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			crawler(child)
		}
	}

	crawler(doc)

	if bhead != nil {
		return bhead, nil
	}

	return bhead, nil
}

func getFallbackURL(title string) string {
	validUrl, err := url.Parse("https://og.barelyhuman.xyz/generate?fontSize=14&backgroundColor=%23121212&title=" + title + "&fontSizeTwo=8&color=%23efefef")
	if err != nil {
		return ""
	}
	return validUrl.String()
}
