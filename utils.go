package main

type StringSet struct {
	collection []string
}

func (s *StringSet) Add(item string) {
	for _, inSet := range s.collection {
		if inSet == item {
			return
		}
	}

	s.collection = append(s.collection, item)
}

func (s *StringSet) JSON() []string {
	return s.collection
}

func (s *StringSet) Delete(item string) {
	newS := StringSet{}
	for _, inSet := range s.collection {
		if inSet != item {
			newS.Add(item)
		}
	}
	s = &newS
}

func NewSet() *StringSet {
	return &StringSet{}
}
