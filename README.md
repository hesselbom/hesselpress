# Hesselpress
Very simple blog tool with admin and static generated html files stored in Redis.

Fast, safe, simple! Version 0.1.

## Prerequisite
Needs redis installed and running.

## Install

```shell
$ npm install
$ cp db.example.json db.json
```

## Run

```shell
$ node index.js
```

## Create new theme
* Copy __/themes/default__ to __/themes/xxx__
* Update theme in __db.json__
* Go to admin and click __Regenerate all__
