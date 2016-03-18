# Hesselpress
Very simple cms tool with admin and static generated html files stored in Redis.

Fast, safe, simple! Version 0.1.

![Screenshot](docs/screenshot.png "Screenshot of admin and generated example page")

## Prerequisite
* Node
* Needs Redis installed and running.

## Install

```shell
$ npm install
$ cp db.example.json db.json
```

## Run

```shell
$ node index.js
```

## Example
For every option you can check __/themes/example__

## Create new theme
* Copy __/themes/default__ to __/themes/xxx__
* Update theme in __db.json__
* Go to admin and save some post to regenerate all posts

### Templates
Every template not starting with an underscore in it's filename will be available as a template for posts. Every template will by default have a title and a content field.

You can set template settings if you create a .json file with the same name as the template. The following options are available:

```json
{
  "name": "Just an image",
  "fields": [
    {
      "id": "image",
      "name": "Image",
      "type": "image"
    },
    {
      "id": "imagecaption",
      "name": "Image Caption",
      "type": "text"
    }
  ],
  "exclude": [ "content" ]
}
```

#### name
The name of the template

#### fields
Array of custom fields for the template. Every field takes the following options:

##### id
Id of field

##### name
Name of field

##### type
Type of field. The following types are currently supported:

* text
* image

#### exclude
Array of fields to exclude
