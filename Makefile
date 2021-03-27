.PHONY: build test testpzplus serve serve-all format scrape

build:
	npm run-script build

build-all: build scrape

test:
	npm test

testpzplus:
	npm run-script testpzplus

serve:
	cd dist && python3 -m http.server -b localhost

serve-all:
	cd dist && python3 -m http.server

format:
	npm run-script format

scrape:
	curl 'https://puzz.link/db/index.js' > dist/db.js
