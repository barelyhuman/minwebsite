package modules

func Bail(err error) {
	if err != nil {
		panic(err)
	}
}
